const { verifyAccessToken } = require("../utils/jwt");

function authRequired(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: "No autorizado" });

  try {
    req.user = verifyAccessToken(token); // { id_user, email, role, username }
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}

module.exports = { authRequired };
