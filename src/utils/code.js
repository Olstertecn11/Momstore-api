const crypto = require("crypto");

function generateOrderCode() {
  // 16 bytes => 32 chars hex (muy difícil de adivinar)
  return crypto.randomBytes(16).toString("hex");
}

module.exports = { generateOrderCode };
