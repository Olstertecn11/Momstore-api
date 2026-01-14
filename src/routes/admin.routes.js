const express = require("express");
const { requireRole } = require("../middleware/requireRole");
const { pool } = require("../db");
const { z } = require("zod");

const router = express.Router();
const { authRequired } = require("../middleware/authRequired");



router.use(requireRole("ADMIN", "WORKER"));

// GET /api/admin/orders
router.get("/orders", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_order, code, entry_date, status, expected_delivery_date, created_at, updated_at
       FROM orders
       ORDER BY id_order DESC
       LIMIT 200`
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// PATCH /api/admin/orders/:id/status
const PatchStatusSchema = z.object({
  status: z.enum(["RECEIVED", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]),
  expected_delivery_date: z.string().min(1).max(20).optional().nullable(),
});

function isValidTransition(from, to) {
  if (to === "CANCELLED") return true;

  const orderFlow = ["RECEIVED", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"];
  const i = orderFlow.indexOf(from);
  const j = orderFlow.indexOf(to);
  if (i === -1 || j === -1) return false;
  return j === i + 1; // solo siguiente paso
}

router.patch("/orders/:id/status", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: "ID inválido" });

    const body = PatchStatusSchema.parse(req.body || {});

    // consultar estado actual
    const [rows] = await pool.execute(
      `SELECT status FROM orders WHERE id_order = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: "Orden no encontrada" });

    const current = rows[0].status;
    if (!isValidTransition(current, body.status)) {
      return res.status(400).json({ message: `Transición inválida: ${current} → ${body.status}` });
    }

    await pool.execute(
      `UPDATE orders
       SET status = ?, expected_delivery_date = ?, updated_at = NOW()
       WHERE id_order = ?`,
      [body.status, body.expected_delivery_date || null, id]
    );

    res.json({ ok: true });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Datos inválidos" });
    next(err);
  }
});

module.exports = router;
