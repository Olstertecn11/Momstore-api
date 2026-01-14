const crypto = require("crypto");
const { REFRESH_TOKEN_SECRET } = require("../config");

function generateOpaqueToken(bytes = 48) {
  // 48 bytes => 64+ chars base64url (muy difícil de adivinar)
  return crypto.randomBytes(bytes).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function hashRefreshToken(token) {
  // HMAC SHA256 (no guardas el token en plano)
  return crypto.createHmac("sha256", REFRESH_TOKEN_SECRET).update(token).digest("hex");
}

module.exports = { generateOpaqueToken, hashRefreshToken };
