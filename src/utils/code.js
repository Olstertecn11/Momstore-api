const crypto = require("crypto");

function generateOrderCode() {
  const prefix = "ORD-";
  const length = 10; // Longitud de la parte aleatoria
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  // Generamos bytes aleatorios
  const bytes = crypto.randomBytes(length);
  let result = "";

  for (let i = 0; i < length; i++) {
    // Usamos el módulo (%) para mapear el byte aleatorio a uno de los caracteres permitidos
    const index = bytes[i] % chars.length;
    result += chars[index];
  }

  return prefix + result;
}

module.exports = { generateOrderCode };