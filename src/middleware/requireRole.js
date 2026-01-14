function requireRole(...rolesAllowed) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ message: "No autorizado" });
    if (!rolesAllowed.includes(role)) return res.status(403).json({ message: "No permitido" });
    next();
  };
}

module.exports = { requireRole };
