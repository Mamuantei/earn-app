const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
db.query(`
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT,
  email TEXT,
  password TEXT,
  balance REAL DEFAULT 0
);
`);

db.query(`
CREATE TABLE IF NOT EXISTS withdraws (
  id SERIAL PRIMARY KEY,
  userId INTEGER,
  amount REAL,
  status TEXT DEFAULT 'pending'
);
`);

const app = express();

app.use(cors({
  origin: "*"
}));
app.use(express.json());

// SIMPLE MEMORY STORAGE
let users = [];
let withdraws = [];

// HOME
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const result = await db.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
      [username, email, password]
    );

    res.json({
      message: "User created",
      user: result.rows[0]
    });

  } catch (err) {
    console.log(err);
    res.json({ error: "Signup failed" });
  }
});
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query(
      "SELECT * FROM users WHERE email=$1 AND password=$2",
      [email, password]
    );

    if (result.rows.length === 0) {
      return res.json({ message: "Invalid login" });
    }

    res.json({
      message: "Login successful",
      user: result.rows[0]
    });

  } catch (err) {
    console.log(err);
    res.json({ error: "Login failed" });
  }
});

app.post("/earn", async (req, res) => {
  const { userId, points } = req.body;

  try {
    const earned = points * 0.002;

    await db.query(
      "UPDATE users SET balance = balance + $1 WHERE id = $2",
      [earned, userId]
    );

    res.json({ earned });

  } catch (err) {
    console.log(err);
    res.json({ error: "Earn failed" });
  }
});
app.post("/withdraw", async (req, res) => {
  const { userId, amount } = req.body;

  try {
    await db.query(
      "INSERT INTO withdraws (userId, amount) VALUES ($1, $2)",
      [userId, amount]
    );

    res.json({ message: "Withdraw request sent" });

  } catch (err) {
    console.log(err);
    res.json({ error: "Withdraw failed" });
  }
});
app.get("/admin/withdraws", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM withdraws");
    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.json({ error: "Failed to load withdraws" });
  }
});

app.post("/admin/approve", async (req, res) => {
  const { id } = req.body;

  try {
    await db.query(
      "UPDATE withdraws SET status='approved' WHERE id=$1",
      [id]
    );

    res.json({ message: "Approved" });
  } catch (err) {
    console.log(err);
    res.json({ error: "Approve failed" });
  }
});
// PORT FIX (IMPORTANT)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
