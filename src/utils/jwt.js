const jwt = require("jsonwebtoken");
const { ACCESS_TOKEN_SECRET, ACCESS_TOKEN_TTL } = require("../config");

function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
}

module.exports = { signAccessToken, verifyAccessToken };
