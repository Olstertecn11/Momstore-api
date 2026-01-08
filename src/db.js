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

module.exports = { pool };
