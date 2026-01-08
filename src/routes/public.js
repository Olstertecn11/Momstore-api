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

module.exports = router;
