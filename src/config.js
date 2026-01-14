require("dotenv").config();

const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";

module.exports = {
  // Server
  PORT: Number(process.env.PORT || 3001),
  API_PREFIX: process.env.API_PREFIX || "/api",
  NODE_ENV,
  isProd,

  // Frontend (para CORS con cookies)
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || "http://localhost:5173",

  // Database
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
  DB_PORT: Number(process.env.DB_PORT || 3306),

  // Auth PRO
  // ✅ Access y Refresh deben tener secretos separados
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET, // fallback si aún no migras
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, // fallback temporal

  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || "15m", // 10–20 min recomendado
  REFRESH_DAYS: Number(process.env.REFRESH_DAYS || 14),
  BCRYPT_ROUNDS: Number(process.env.BCRYPT_ROUNDS || 12),

  // Legacy (si aún lo usas en algún lugar)
  JWT_SECRET: process.env.JWT_SECRET,

  // Mail
  MAIL_HOST: process.env.MAIL_HOST,
  MAIL_PORT: Number(process.env.MAIL_PORT || 587),
  MAIL_USER: process.env.MAIL_USER,
  MAIL_PASS: process.env.MAIL_PASS,
  MAIL_TO: process.env.MAIL_TO,
};
