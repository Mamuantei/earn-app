const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// 🔗 DATABASE (Render PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// ✅ CREATE TABLES
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT,
      email TEXT UNIQUE,
      password TEXT,
      balance INTEGER DEFAULT 0
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS withdraws (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      amount INTEGER,
      status TEXT DEFAULT 'pending'
    );
  `);
}
initDB();


// 🔐 SIGNUP
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1,$2,$3) RETURNING *",
      [username, email, password]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.json({ message: "User already exists ❌" });
  }
});


// 🔐 LOGIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE email=$1 AND password=$2",
    [email, password]
  );

  if (result.rows.length === 0) {
    return res.json({ message: "Invalid login ❌" });
  }

  res.json({ user: result.rows[0] });
});


// 💰 GET BALANCE
app.get("/balance/:id", async (req, res) => {
  const result = await pool.query(
    "SELECT balance FROM users WHERE id=$1",
    [req.params.id]
  );

  res.json({ balance: result.rows[0]?.balance || 0 });
});


// 💸 EARN
app.post("/earn", async (req, res) => {
  const { userId, points } = req.body;

  await pool.query(
    "UPDATE users SET balance = balance + $1 WHERE id=$2",
    [points, userId]
  );

  res.json({ earned: points / 500 }); // ₹ conversion
});


// 💳 WITHDRAW
app.post("/withdraw", async (req, res) => {
  const { userId, amount } = req.body;

  const user = await pool.query(
    "SELECT balance FROM users WHERE id=$1",
    [userId]
  );

  if (user.rows[0].balance < amount) {
    return res.json({ message: "Not enough balance ❌" });
  }

  await pool.query(
    "UPDATE users SET balance = balance - $1 WHERE id=$2",
    [amount, userId]
  );

  await pool.query(
    "INSERT INTO withdraws (user_id, amount) VALUES ($1,$2)",
    [userId, amount]
  );

  res.json({ message: "Withdraw request sent ✅" });
});


// 🧑‍💼 ADMIN - GET WITHDRAWS
app.get("/admin/withdraws", async (req, res) => {
  const result = await pool.query("SELECT * FROM withdraws");
  res.json(result.rows);
});


// 🧑‍💼 ADMIN - APPROVE
app.post("/admin/approve", async (req, res) => {
  const { id } = req.body;

  await pool.query(
    "UPDATE withdraws SET status='approved' WHERE id=$1",
    [id]
  );

  res.json({ message: "Approved ✅" });
});


// 🚀 START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
