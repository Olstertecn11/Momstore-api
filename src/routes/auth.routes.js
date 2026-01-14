const express = require("express");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");

const { authRequired } = require("../middleware/authRequired");

const {
  loginWithEmailPassword,
  rotateRefreshToken,
  revokeRefreshToken,
  getUserById,
  buildUserSafe: safeUser,
  createAccessTokenForUser,
} = require("../services/auth.service");

//const { authRequired } = require("../middleware/authRequired");
const { isProd } = require("../config");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Demasiados intentos. Intenta de nuevo en un minuto." },
});

const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(255),
});

// ✅ Cookie para cross-site (localhost -> onrender HTTPS)
function refreshCookieOptions() {
  // si estás en https (render), debe ser None + Secure
  // en local http: secure=false y sameSite=lax
  if (isProd) {
    return { httpOnly: true, secure: true, sameSite: "none", path: "/api/auth" };
  }
  return { httpOnly: true, secure: false, sameSite: "lax", path: "/api/auth" };
}

// POST /api/auth/login
router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const body = LoginSchema.parse(req.body || {});
    const result = await loginWithEmailPassword(body.email, body.password);
    if (!result) return res.status(401).json({ message: "Credenciales inválidas" });

    res.cookie("refresh_token", result.refreshToken, refreshCookieOptions());

    return res.json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ message: "Datos inválidos" });
    next(err);
  }
});

// POST /api/auth/refresh
router.post("/refresh", async (req, res, next) => {
  try {
    const old = req.cookies?.refresh_token;
    if (!old) return res.status(401).json({ message: "No autorizado" });

    const rotated = await rotateRefreshToken(old);
    if (!rotated) return res.status(401).json({ message: "No autorizado" });

    const u = await getUserById(rotated.userId);
    if (!u || Number(u.is_active) !== 1) return res.status(401).json({ message: "No autorizado" });

    res.cookie("refresh_token", rotated.token, refreshCookieOptions());
    const accessToken = createAccessTokenForUser(u);

    return res.json({ accessToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post("/logout", async (req, res, next) => {
  try {
    const t = req.cookies?.refresh_token;
    if (t) await revokeRefreshToken(t);

    res.clearCookie("refresh_token", refreshCookieOptions());
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get("/me", authRequired, async (req, res, next) => {
  try {
    const u = await getUserById(req.user.id_user);
    if (!u) return res.status(401).json({ message: "No autorizado" });
    return res.json({ user: safeUser(u) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
