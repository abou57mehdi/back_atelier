const express = require("express");
const router = express.Router();
const Site = require("../models/Site");
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

// GET /api/sites - list sites
router.get("/", auth, async (req, res) => {
  try {
    const sites = await Site.find()
      .populate("assignedManager", "firstName lastName")
      .populate("assignedEquipment");
    res.json(sites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sites - create site
router.post("/", auth, async (req, res) => {
  try {
    const { name, address, assignedManager, assignedEquipment } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Site name is required" });
    }

    const site = new Site({
      name,
      address,
      assignedManager,
      assignedEquipment,
    });
    await site.save();
    res.status(201).json({ message: "Site created", site });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sites/:id - get site details
router.get("/:id", auth, async (req, res) => {
  try {
    const site = await Site.findById(req.params.id)
      .populate("assignedManager", "firstName lastName email")
      .populate("assignedEquipment");
    if (!site) return res.status(404).json({ error: "Site not found" });
    res.json(site);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sites/:id - update site
router.put("/:id", auth, async (req, res) => {
  try {
    const updates = req.body;
    const site = await Site.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    if (!site) return res.status(404).json({ error: "Site not found" });
    res.json({ message: "Site updated", site });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sites/:id - delete site
router.delete("/:id", auth, async (req, res) => {
  try {
    const site = await Site.findByIdAndDelete(req.params.id);
    if (!site) return res.status(404).json({ error: "Site not found" });
    res.json({ message: "Site deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
