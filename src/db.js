const mysql = require("mysql2/promise");
const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = require("./config");

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: Number(DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8",
});

async function checkDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`✅ Conectado exitosamente a la BD: ${DB_NAME}`);
    connection.release();
    return true;
  } catch (error) {
    console.error("❌ ERROR FATAL DE BASE DE DATOS:");
    console.error(error.message);
    return false;
  }
}

module.exports = {
  pool, checkDatabaseConnection
};
