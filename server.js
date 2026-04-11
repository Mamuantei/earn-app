const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// DB
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) console.log(err);
  else console.log("✅ SQLite Connected");
});

// CREATE TABLES
db.run(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  email TEXT,
  password TEXT,
  balance REAL DEFAULT 0,
  referralCode TEXT
)
`);

db.run(`
CREATE TABLE IF NOT EXISTS withdraws (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER,
  amount REAL,
  status TEXT DEFAULT 'pending'
)
`);

// TEST
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// SIGNUP
app.post("/signup", (req, res) => {
  const { username, email, password, referralCode } = req.body;

  const myCode = Math.random().toString(36).substring(7);

  db.run(
    "INSERT INTO users (username, email, password, referralCode, balance) VALUES (?, ?, ?, ?, 0)",
    [username, email, password, myCode],
    function (err) {
      if (err) return res.json({ error: err.message });

      // referral reward
      if (referralCode) {
        db.get(
          "SELECT * FROM users WHERE referralCode = ?",
          [referralCode],
          (err, refUser) => {
            if (refUser) {
              db.run(
                "UPDATE users SET balance = balance + 10 WHERE id = ?",
                [refUser.id]
              );
            }
          }
        );
      }

      res.json({
        message: "User created",
        yourReferralCode: myCode
      });
    }
  );
});

// LOGIN
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE email = ? AND password = ?",
    [email, password],
    (err, user) => {
      if (!user) return res.json({ message: "Invalid credentials" });

      res.json({
        message: "Login successful",
        user: user
      });
    }
  );
});

// BALANCE
app.get("/balance/:id", (req, res) => {
  db.get(
    "SELECT balance FROM users WHERE id = ?",
    [req.params.id],
    (err, row) => {
      res.json({ balance: row.balance });
    }
  );
});

// EARN
app.post("/earn", (req, res) => {
  const { userId, points } = req.body;

  const earned = points * 0.002;

  db.run(
    "UPDATE users SET balance = balance + ? WHERE id = ?",
    [earned, userId],
    function (err) {
      res.json({ earned });
    }
  );
});

// WITHDRAW
app.post("/withdraw", (req, res) => {
  const { userId, amount } = req.body;

  db.run(
    "INSERT INTO withdraws (userId, amount) VALUES (?, ?)",
    [userId, amount],
    function (err) {
      res.json({ message: "Withdraw request submitted" });
    }
  );
});

// ADMIN VIEW
app.get("/admin/withdraws", (req, res) => {
  db.all("SELECT * FROM withdraws", [], (err, rows) => {
    res.json(rows);
  });
});

// ADMIN APPROVE
app.post("/admin/approve", (req, res) => {
  const { id } = req.body;

  db.run(
    "UPDATE withdraws SET status = 'completed' WHERE id = ?",
    [id],
    function (err) {
      res.json({ message: "Withdraw approved" });
    }
  );
});

// START SERVER
app.listen(5000, () => {
  console.log("Server running on port 5000");
});