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

    // 1) Insertar customer en anonymous_order_details
    const [custRes] = await conn.execute(
      `INSERT INTO anonymous_order_details
        (customer_name, customer_email, customer_phone, customer_address, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [
        parsed.customer.name,
        parsed.customer.email,
        parsed.customer.phone,
        parsed.customer.address,
      ]
    );
    const anonId = custRes.insertId;

    // 2) Traer productos y calcular totales (precio “congelado” al comprar)
    const ids = parsed.items.map(i => i.product_id);
    const [products] = await conn.query(
      `SELECT id_product, name, price, stock, is_active
       FROM products
       WHERE id_product IN (${ids.map(() => "?").join(",")})`,
      ids
    );

    if (products.length !== ids.length) {
      throw new Error("Uno o más productos no existen.");
    }

    // Validar activos y stock
    const productMap = new Map(products.map(p => [p.id_product, p]));
    const lines = [];
    let total = 0;

    for (const it of parsed.items) {
      const p = productMap.get(it.product_id);
      if (!p || Number(p.is_active) !== 1) throw new Error("Producto inactivo/no válido.");
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

    // 3) Crear order
    const code = generateOrderCode();
    const entryDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const [orderRes] = await conn.execute(
      `INSERT INTO orders
        (code, entry_date, id_user_fk, id_anonymous_order_details_fk, status, expected_delivery_date, is_active, created_at)
       VALUES (?, ?, NULL, ?, 'PENDING', NULL, 1, CURRENT_TIMESTAMP)`,
      [code, entryDate, anonId]
    );
    const orderId = orderRes.insertId;

    // 4) Insertar order_details + descontar stock
    for (const ln of lines) {
      await conn.execute(
        `INSERT INTO order_details
          (id_order_fk, id_product_fk, unit_price, quantity, line_amount, created_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [orderId, ln.product_id, ln.unit_price, ln.quantity, ln.line_amount]
      );

      await conn.execute(
        `UPDATE products SET stock = stock - ? WHERE id_product = ?`,
        [ln.quantity, ln.product_id]
      );
    }

    // 5) (Opcional) guardar total en orders si tienes campo total_amount
    // Si NO tienes total_amount, ignora este UPDATE.
    try {
      await conn.execute(`UPDATE orders SET total_amount = ? WHERE id_order = ?`, [total.toFixed(2), orderId]);
    } catch (_) { }

    await conn.commit();

    // 6) Email al negocio (fuera de la transacción)
    await sendNewOrderEmail({
      code,
      customer: parsed.customer,
      items: lines,
      total: total.toFixed(2),
    });

    return { code, status: "PENDING", total: total.toFixed(2) };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getOrderByCode(code) {
  const [orders] = await pool.execute(
    `SELECT id_order, code, entry_date, status, expected_delivery_date
     FROM orders
     WHERE code = ?
     LIMIT 1`,
    [code]
  );
  if (!orders.length) return null;

  const order = orders[0];
  const [items] = await pool.execute(
    `SELECT od.quantity, od.unit_price, od.line_amount, p.name
     FROM order_details od
     JOIN products p ON p.id_product = od.id_product_fk
     WHERE od.id_order_fk = ?`,
    [order.id_order]
  );

  return { ...order, items };
}

module.exports = { createGuestOrder, getOrderByCode };
