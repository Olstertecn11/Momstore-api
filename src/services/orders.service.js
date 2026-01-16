const { z } = require("zod");
const { pool } = require("../db");
const { generateOrderCode } = require("../utils/code");
const { sendNewOrderEmail } = require("../utils/mailer");

const CreateOrderSchema = z.object({
  customer: z.object({
    name: z.string().min(2).max(255),
    email: z.string().email().max(200),
    phone: z.string().min(5).max(20),
    address: z.string().min(5).max(255),
  }),
  items: z.array(
    z.object({
      product_id: z.number().int().positive(),
      quantity: z.number().int().positive().max(999),
    })
  ).min(1),
});

async function createGuestOrder(payload) {
  const parsed = CreateOrderSchema.parse(payload);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1) Insertar cliente
    const [custRes] = await conn.execute(
      `INSERT INTO anonymous_order_details
        (customer_name, customer_email, customer_phone, customer_address, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [parsed.customer.name, parsed.customer.email, parsed.customer.phone, parsed.customer.address]
    );
    const anonId = custRes.insertId;

    // 2) Obtener productos y validar
    const ids = parsed.items.map(i => i.product_id);
    const [products] = await conn.query(
      `SELECT id_product, name, price, stock, is_active FROM products WHERE id_product IN (${ids.map(() => "?").join(",")})`,
      ids
    );

    if (products.length !== ids.length) throw new Error("Uno o más productos no existen.");

    const productMap = new Map(products.map(p => [p.id_product, p]));
    const lines = [];
    let total = 0;

    for (const it of parsed.items) {
      const p = productMap.get(it.product_id);
      if (!p || Number(p.is_active) !== 1) throw new Error("Producto inactivo.");
      if (Number(p.stock) < it.quantity) throw new Error(`Stock insuficiente: ${p.name}`);

      const unit = Number(p.price);
      const line = unit * it.quantity;
      total += line;
      lines.push({
        product_id: p.id_product,
        name: p.name,
        unit_price: unit.toFixed(2),
        quantity: it.quantity,
        line_amount: line.toFixed(2),
      });
    }

    // 3) Crear orden
    const code = generateOrderCode();
    const entryDate = new Date().toISOString().slice(0, 10);

    const [orderRes] = await conn.execute(
      `INSERT INTO orders (code, entry_date, id_anonymous_order_details_fk, status, is_active, created_at)
       VALUES (?, ?, ?, 'PENDING', 1, CURRENT_TIMESTAMP)`,
      [code, entryDate, anonId]
    );
    const orderId = orderRes.insertId;

    // 4) Detalles y Stock
    for (const ln of lines) {
      await conn.execute(
        `INSERT INTO order_details (id_order_fk, id_product_fk, unit_price, quantity, line_amount) VALUES (?, ?, ?, ?, ?)`,
        [orderId, ln.product_id, ln.unit_price, ln.quantity, ln.line_amount]
      );
      await conn.execute(`UPDATE products SET stock = stock - ? WHERE id_product = ?`, [ln.quantity, ln.product_id]);
    }

    try {
      await conn.execute(`UPDATE orders SET total_amount = ? WHERE id_order = ?`, [total.toFixed(2), orderId]);
    } catch (_) { }

    // ¡ÉXITO EN DB!
    await conn.commit();

    // 6) NOTIFICACIONES (Se hacen después del commit para asegurar que el pedido existe)
    // Usamos un try/catch interno para que si falla el email, el usuario igual reciba su confirmación en pantalla
    try {
      // Correo al CLIENTE
      await sendNewOrderEmail({
        to: parsed.customer.email,
        subject: `Confirmación de Pedido #${code}`,
        code,
        customer: parsed.customer,
        items: lines,
        total: total.toFixed(2)
      });

      // Correo al NEGOCIO
      await sendNewOrderEmail({
        to: "olstertecn597@gmail.com", // Tu correo de gestión
        subject: `NUEVO PEDIDO RECIBIDO #${code}`,
        code,
        customer: parsed.customer,
        items: lines,
        total: total.toFixed(2)
      });
    } catch (mailErr) {
      console.error("Error enviando correos post-venta:", mailErr);
    }

    return { code, status: "PENDING", total: total.toFixed(2) };

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getOrderByCode(code) {
  // 1. Obtenemos la orden junto con los datos del cliente (registrado o anónimo)
  const [orders] = await pool.execute(
    `SELECT 
        o.id_order, 
        o.code, 
        o.entry_date, 
        o.status, 
        o.expected_delivery_date,
        o.id_user_fk,
        o.id_anonymous_order_details_fk,
        u.username AS registered_username,
        u.email AS registered_email,
        a.customer_name, 
        a.customer_email, 
        a.customer_phone, 
        a.customer_address
     FROM orders o
     LEFT JOIN users u ON o.id_user_fk = u.id_user
     LEFT JOIN anonymous_order_details a ON o.id_anonymous_order_details_fk = a.id_anonymous_order_detail
     WHERE o.code = ?
     LIMIT 1`,
    [code]
  );

  if (!orders.length) return null;

  const orderData = orders[0];

  // 2. Normalizamos la información del cliente para que sea fácil de usar en el frontend
  const customer = orderData.id_user_fk
    ? {
      is_anonymous: false,
      name: orderData.registered_username,
      email: orderData.registered_email,
      phone: null, // Los usuarios registrados suelen tener su teléfono en la tabla 'users' o un perfil
      address: 'Consultar perfil de usuario'
    }
    : {
      is_anonymous: true,
      name: orderData.customer_name,
      email: orderData.customer_email,
      phone: orderData.customer_phone,
      address: orderData.customer_address
    };

  // 3. Obtenemos los productos de la orden
  const [items] = await pool.execute(
    `SELECT 
        od.quantity, 
        od.unit_price, 
        od.line_amount, 
        p.name,
        p.image_url
     FROM order_details od
     JOIN products p ON p.id_product = od.id_product_fk
     WHERE od.id_order_fk = ?`,
    [orderData.id_order]
  );

  // 4. Retornamos el objeto limpio
  return {
    id_order: orderData.id_order,
    code: orderData.code,
    entry_date: orderData.entry_date,
    status: orderData.status,
    expected_delivery_date: orderData.expected_delivery_date,
    customer, // Aquí van todos los datos del cliente unificados
    items     // Los productos
  };
}

module.exports = { createGuestOrder, getOrderByCode };
