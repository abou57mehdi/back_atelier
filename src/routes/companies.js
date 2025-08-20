const express = require("express");
const router = express.Router();
const Company = require("../models/Company");
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

// GET /api/companies - list companies (admin only)
router.get("/", auth, async (req, res) => {
  try {
    const companies = await Company.find().populate(
      "mainManager",
      "firstName lastName email"
    );
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/companies - create company
router.post("/", auth, async (req, res) => {
  try {
    const { name, siret, mainManagerData } = req.body;
    if (!name || !mainManagerData) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create main manager user
    const { firstName, lastName, email, phone } = mainManagerData;
    const tempPassword = Math.random().toString(36).slice(-8);
    const hash = await require("bcryptjs").hash(tempPassword, 10);

    const manager = new User({
      firstName,
      lastName,
      email,
      phone,
      role: "manager",
      password: hash,
    });
    await manager.save();

    // Create company
    const company = new Company({
      name,
      siret,
      mainManager: manager._id,
    });
    await company.save();

    // Associate manager with company
    manager.company = company._id;
    await manager.save();

    res.status(201).json({
      message: "Company created",
      company,
      tempPassword: tempPassword, // In production, send via email
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/companies/:id - get company details
router.get("/:id", auth, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate("mainManager", "firstName lastName email")
      .populate("sites")
      .populate("workshops")
      .populate("equipment");
    if (!company) return res.status(404).json({ error: "Company not found" });
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/companies/:id - update company
router.put("/:id", auth, async (req, res) => {
  try {
    const updates = req.body;
    const company = await Company.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    if (!company) return res.status(404).json({ error: "Company not found" });
    res.json({ message: "Company updated", company });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
