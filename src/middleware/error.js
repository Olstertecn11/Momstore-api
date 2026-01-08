function errorHandler(err, req, res, next) {
  console.error(err);

  // Errores de validación zod
  if (err?.name === "ZodError") {
    return res.status(400).json({ message: "Datos inválidos", issues: err.issues });
  }

  return res.status(500).json({ message: err.message || "Error interno" });
}

module.exports = { errorHandler };
