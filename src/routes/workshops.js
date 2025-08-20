const express = require("express");
const router = express.Router();
const Workshop = require("../models/Workshop");
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

// GET /api/workshops - list workshops
router.get("/", auth, async (req, res) => {
  try {
    const workshops = await Workshop.find()
      .populate("assignedManager", "firstName lastName")
      .populate("assignedEquipment");
    res.json(workshops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workshops - create workshop
router.post("/", auth, async (req, res) => {
  try {
    const { name, assignedManager, assignedEquipment, teams } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Workshop name is required" });
    }

    const workshop = new Workshop({
      name,
      assignedManager,
      assignedEquipment,
      teams,
    });
    await workshop.save();
    res.status(201).json({ message: "Workshop created", workshop });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workshops/:id - get workshop details
router.get("/:id", auth, async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id)
      .populate("assignedManager", "firstName lastName email")
      .populate("assignedEquipment");
    if (!workshop) return res.status(404).json({ error: "Workshop not found" });
    res.json(workshop);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/workshops/:id - update workshop
router.put("/:id", auth, async (req, res) => {
  try {
    const updates = req.body;
    const workshop = await Workshop.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    if (!workshop) return res.status(404).json({ error: "Workshop not found" });
    res.json({ message: "Workshop updated", workshop });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/workshops/:id - delete workshop
router.delete("/:id", auth, async (req, res) => {
  try {
    const workshop = await Workshop.findByIdAndDelete(req.params.id);
    if (!workshop) return res.status(404).json({ error: "Workshop not found" });
    res.json({ message: "Workshop deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
