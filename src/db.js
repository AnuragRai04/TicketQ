const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("connect", () => {
  console.log("Successfully connected to the PostgreSQL database!");
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
module.exports = {
  query: (text, params) => pool.query(text, params),
  getPool: () => pool, // <-- Add this line
};
