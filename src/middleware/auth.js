// Cambia esto:
// const { JWT_SECRET } = require("../config");
// Por esto:
const { verifyAccessToken } = require("../utils/jwt");

function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;

  if (!token) return res.status(401).json({ message: "No autorizado" });

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (error) {
    console.error("JWT Error:", error.message);
    return res.status(401).json({ message: "Token inválido" });
  }
}

module.exports = { requireAuth };