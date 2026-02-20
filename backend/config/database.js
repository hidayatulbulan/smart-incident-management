const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), override: true });
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  socketPath: undefined,
  host: "localhost",
  user: "root",
  password: "",
  database: "smartincident",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.getConnection()
  .then((conn) => {
    console.log("MYSQL CONNECTED");
    conn.release();
  })
  .catch((err) => {
    console.error("MYSQL GAGAL:", err.message);
    console.error("Detail:", err);
  });

module.exports = pool;