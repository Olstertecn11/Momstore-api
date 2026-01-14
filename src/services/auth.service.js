const bcrypt = require("bcrypt");
const { pool } = require("../db");
const { signAccessToken } = require("../utils/jwt");
const { generateOpaqueToken, hashRefreshToken } = require("../utils/token");
const { toMySQLDateTime } = require("../utils/datetime");
const { REFRESH_DAYS } = require("../config");

async function findUserByEmail(email) {
  const [rows] = await pool.execute(
    `SELECT u.id_user, u.username, u.email, u.password_hash, u.is_active, r.role AS role
     FROM users u
     JOIN roles r ON r.id_role = u.id_role_fk
     WHERE u.email = ?
     LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

function buildUserSafe(u) {
  return { id: u.id_user, username: u.username, email: u.email, role: u.role };
}

function createAccessTokenForUser(u) {
  return signAccessToken({
    id_user: u.id_user,
    email: u.email,
    username: u.username,
    role: u.role,
  });
}

async function issueRefreshToken(userId) {
  const token = generateOpaqueToken(48);
  const tokenHash = hashRefreshToken(token);

  const expires = new Date();
  expires.setDate(expires.getDate() + REFRESH_DAYS);

  await pool.execute(
    `INSERT INTO refresh_tokens (id_user_fk, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?)`,
    [userId, tokenHash, toMySQLDateTime(expires), toMySQLDateTime(new Date())]
  );

  return { token, expires };
}

async function revokeRefreshToken(token) {
  if (!token) return;
  const tokenHash = hashRefreshToken(token);

  await pool.execute(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE token_hash = ?
       AND revoked_at IS NULL`,
    [tokenHash]
  );
}

async function rotateRefreshToken(oldToken) {
  const oldHash = hashRefreshToken(oldToken);

  const [rows] = await pool.execute(
    `SELECT id_refresh_token, id_user_fk, expires_at, revoked_at
     FROM refresh_tokens
     WHERE token_hash = ?
     LIMIT 1`,
    [oldHash]
  );
  const rt = rows[0];
  if (!rt) return null;
  if (rt.revoked_at) return null;

  // expiración
  const [expRows] = await pool.execute(
    `SELECT (expires_at > NOW()) AS is_valid
     FROM refresh_tokens
     WHERE id_refresh_token = ?
     LIMIT 1`,
    [rt.id_refresh_token]
  );
  const isValid = expRows[0]?.is_valid === 1 || expRows[0]?.is_valid === true;
  if (!isValid) return null;

  // revocar el viejo (rotación)
  await pool.execute(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE id_refresh_token = ?`,
    [rt.id_refresh_token]
  );

  // emitir nuevo
  const issued = await issueRefreshToken(rt.id_user_fk);
  return { userId: rt.id_user_fk, ...issued };
}

async function loginWithEmailPassword(email, password) {
  const u = await findUserByEmail(email);
  console.log("User found:", u);
  if (!u) return null;
  if (Number(u.is_active) !== 1) return { inactive: true };

  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) return null;

  const accessToken = createAccessTokenForUser(u);
  const refresh = await issueRefreshToken(u.id_user);

  return {
    user: buildUserSafe(u),
    accessToken,
    refreshToken: refresh.token,
    refreshExpires: refresh.expires,
  };
}

async function getUserById(id_user) {
  const [rows] = await pool.execute(
    `SELECT u.id_user, u.username, u.email, u.is_active, r.role AS role
     FROM users u
     JOIN roles r ON r.id_role = u.id_role_fk
     WHERE u.id_user = ?
     LIMIT 1`,
    [id_user]
  );
  return rows[0] || null;
}

module.exports = {
  loginWithEmailPassword,
  rotateRefreshToken,
  revokeRefreshToken,
  getUserById,
  buildUserSafe,
  createAccessTokenForUser,
};
