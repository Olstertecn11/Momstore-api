const express = require("express");
const { pool } = require("../db");
const { createGuestOrder, getOrderByCode } = require("../services/orders.service");

const router = express.Router();

// Categorías activas
router.get("/categories", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_category, category
       FROM categories
       WHERE is_active = 1
       ORDER BY category`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// Productos activos (filtros: category_id, q)
router.get("/products", async (req, res, next) => {
  try {
    const { category_id, q } = req.query;

    const params = [];
    let sql = `SELECT id_product, name, description, price, stock, id_category_fk, image_url
               FROM products
               WHERE is_active = 1`;

    if (category_id) {
      sql += ` AND id_category_fk = ?`;
      params.push(Number(category_id));
    }
    if (q) {
      sql += ` AND (name LIKE ? OR description LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }

    sql += ` ORDER BY name`;

    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (e) { next(e); }
});

// Crear pedido (guest)
router.post("/orders", async (req, res, next) => {
  try {
    const result = await createGuestOrder(req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
});

// Consultar pedido por código
router.get("/orders/:code", async (req, res, next) => {
  try {
    const order = await getOrderByCode(req.params.code);
    if (!order) return res.status(404).json({ message: "Pedido no encontrado" });
    res.json(order);
  } catch (e) { next(e); }
});



// POST: Crear producto
router.post("/products", async (req, res, next) => {
  try {
    const data = ProductSchema.parse(req.body);
    const [result] = await pool.execute(
      `INSERT INTO products (name, description, image_url, price, stock, id_category_fk, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.name, data.description, data.image_url, data.price, data.stock, data.id_category_fk, data.is_active]
    );
    res.status(201).json({ id: result.insertId, ...data });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json(e.errors);
    next(e);
  }
});

// PUT: Actualizar producto
router.put("/products/:id", async (req, res, next) => {
  try {
    const data = ProductSchema.parse(req.body);
    await pool.execute(
      `UPDATE products SET name=?, description=?, image_url=?, price=?, stock=?, id_category_fk=?, is_active=? 
       WHERE id_product = ?`,
      [data.name, data.description, data.image_url, data.price, data.stock, data.id_category_fk, data.is_active, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// DELETE: Eliminación lógica (is_active = 0)
router.delete("/products/:id", async (req, res, next) => {
  try {
    await pool.execute("UPDATE products SET is_active = 0 WHERE id_product = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});



module.exports = router;
