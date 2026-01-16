const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool } = require("../db");
const { JWT_SECRET } = require("../config");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();



// GET /api/admin/orders/:id/items
router.get("/orders/:id/items", async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT 
        od.id_order_detail, od.quantity, od.unit_price, od.line_amount,
        p.name as product_name, p.image_url
       FROM order_details od
       JOIN products p ON od.id_product_fk = p.id_product
       WHERE od.id_order_fk = ?`,
      [id]
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// Login admin
router.post("/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "email y password requeridos" });

    const [rows] = await pool.execute(
      `SELECT id_user, email, password_hash, is_active
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (!rows.length) return res.status(401).json({ message: "Credenciales inválidas" });
    const u = rows[0];
    if (Number(u.is_active) !== 1) return res.status(403).json({ message: "Usuario inactivo" });

    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ message: "Credenciales inválidas" });

    const token = jwt.sign({ id_user: u.id_user, email: u.email }, JWT_SECRET, { expiresIn: "8h" });
    res.json({ token });
  } catch (e) { next(e); }
});

// GET /api/admin/orders
router.get("/orders", async (req, res, next) => {
  try {
    // Unimos con anonymous_order_details para obtener los datos de envío
    // y con users por si es un usuario registrado
    const [rows] = await pool.query(
      `SELECT 
        o.*, 
        aod.customer_name, aod.customer_phone, aod.customer_address, aod.customer_email,
        u.username as registered_username
       FROM orders o
       LEFT JOIN anonymous_order_details aod ON o.id_anonymous_order_details_fk = aod.id_anonymous_order_detail
       LEFT JOIN users u ON o.id_user_fk = u.id_user
       WHERE o.is_active = 1
       ORDER BY o.id_order DESC LIMIT 100`
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// Cambiar estado + fecha prometida
router.patch("/orders/:id/status", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { status, expected_delivery_date } = req.body || {};

    const allowed = new Set(["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]);
    if (!allowed.has(status)) return res.status(400).json({ message: "Estado inválido" });

    await pool.execute(
      `UPDATE orders
       SET status = ?, expected_delivery_date = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id_order = ?`,
      [status, expected_delivery_date || null, id]
    );

    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
