const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// JWT middleware
function auth(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token" });
    req.user = decoded;
    next();
  });
}

// GET /api/users - get all users (protected)
router.get("/", auth, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users - create user (protected)
router.post("/", auth, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, role, password } = req.body;
    if (!firstName || !lastName || !email || !role || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: "User already exists" });
    const hash = await require("bcryptjs").hash(password, 10);
    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      role,
      password: hash,
    });
    await user.save();
    res.status(201).json({ message: "User created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id - get user profile (protected)
router.get("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id - update user (protected)
router.put("/:id", auth, async (req, res) => {
  try {
    const updates = req.body;
    if (updates.password) {
      updates.password = await require("bcryptjs").hash(updates.password, 10);
    }
    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User updated", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id - deactivate user (protected)
router.delete("/:id", auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: "inactive" },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deactivated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
