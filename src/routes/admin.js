const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool } = require("../db");
const { JWT_SECRET } = require("../config");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

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

// Listar pedidos (admin)
router.get("/orders", requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_order, code, entry_date, status, expected_delivery_date
       FROM orders
       ORDER BY id_order DESC
       LIMIT 200`
    );
    res.json(rows);
  } catch (e) { next(e); }
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
