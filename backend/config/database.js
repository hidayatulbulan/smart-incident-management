const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "incident_db",
});

db.connect((err) => {
  if (err) {
    console.error("MYSQL GAGAL:", err.message);
  } else {
    console.log("MYSQL CONNECTED");
  }
});

module.exports = db;
