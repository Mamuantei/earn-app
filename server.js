const express = require("express");
const cors = require("cors");

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

// SIGNUP
app.post("/signup", (req, res) => {
  const user = {
    id: users.length + 1,
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    balance: 0
  };

  users.push(user);

  res.json({ message: "User created", user });
});

// LOGIN
app.post("/login", (req, res) => {
  const user = users.find(
    u => u.email === req.body.email && u.password === req.body.password
  );

  if (!user) {
    return res.json({ message: "Invalid login" });
  }

  res.json({ message: "Login successful", user });
});

// EARN
app.post("/earn", (req, res) => {
  const user = users.find(u => u.id === req.body.userId);

  if (!user) return res.json({ error: "User not found" });

  let earned = req.body.points * 0.002;
  user.balance += earned;

  res.json({ earned });
});

// WITHDRAW
app.post("/withdraw", (req, res) => {
  withdraws.push({
    id: withdraws.length + 1,
    userId: req.body.userId,
    amount: req.body.amount,
    status: "pending"
  });

  res.json({ message: "Withdraw request sent" });
});

// ADMIN
app.get("/admin/withdraws", (req, res) => {
  res.json(withdraws);
});

// APPROVE
app.post("/admin/approve", (req, res) => {
  const w = withdraws.find(x => x.id === req.body.id);
  if (w) w.status = "approved";

  res.json({ message: "Approved" });
});

// PORT FIX (IMPORTANT)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});