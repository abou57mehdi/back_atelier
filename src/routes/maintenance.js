const express = require("express");
const router = express.Router();
const Maintenance = require("../models/Maintenance");
const Equipment = require("../models/Equipment");
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

// GET /api/maintenance - list maintenance tasks
router.get("/", auth, async (req, res) => {
  try {
    const { type, status, equipment, workshop, upcoming } = req.query;
    let filter = {};

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (equipment) filter.equipment = equipment;
    if (workshop) filter.workshop = workshop;

    // Filter upcoming maintenance (next 15 days)
    if (upcoming === "true") {
      const fifteenDaysFromNow = new Date();
      fifteenDaysFromNow.setDate(fifteenDaysFromNow.getDate() + 15);
      filter.scheduledDate = { $lte: fifteenDaysFromNow };
    }

    const maintenance = await Maintenance.find(filter)
      .populate("equipment", "billunId internalId licensePlate")
      .populate("workshop", "name")
      .sort({ scheduledDate: 1 });

    res.json(maintenance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/maintenance - schedule maintenance
router.post("/", auth, async (req, res) => {
  try {
    const { equipment, type, scheduledDate, description, workshop } = req.body;

    // Validate equipment exists
    const equipmentDoc = await Equipment.findById(equipment);
    if (!equipmentDoc)
      return res.status(404).json({ error: "Equipment not found" });

    const maintenance = new Maintenance({
      equipment,
      type,
      scheduledDate,
      description,
      workshop,
    });

    await maintenance.save();

    res.status(201).json({
      message: "Maintenance scheduled",
      maintenance,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/maintenance/:id - get maintenance details
router.get("/:id", auth, async (req, res) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id)
      .populate("equipment")
      .populate("workshop", "name teams");

    if (!maintenance)
      return res.status(404).json({ error: "Maintenance not found" });
    res.json(maintenance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/maintenance/:id - update maintenance status
router.put("/:id", auth, async (req, res) => {
  try {
    const updates = req.body;

    // Auto-set completion date when status changes to completed
    if (updates.status === "completed" && !updates.completedDate) {
      updates.completedDate = new Date();
    }

    const maintenance = await Maintenance.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );
    if (!maintenance)
      return res.status(404).json({ error: "Maintenance not found" });

    res.json({ message: "Maintenance updated", maintenance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/maintenance/stats/dashboard - maintenance dashboard stats
router.get("/stats/dashboard", auth, async (req, res) => {
  try {
    const today = new Date();
    const fifteenDaysFromNow = new Date();
    fifteenDaysFromNow.setDate(fifteenDaysFromNow.getDate() + 15);

    const stats = {
      total: await Maintenance.countDocuments(),
      inProgress: await Maintenance.countDocuments({ status: "in_progress" }),
      completed: await Maintenance.countDocuments({ status: "completed" }),
      awaitingParts: await Maintenance.countDocuments({
        status: "awaiting_parts",
      }),
      upcomingDeadlines: await Maintenance.countDocuments({
        scheduledDate: { $lte: fifteenDaysFromNow },
        status: { $ne: "completed" },
      }),
      byType: await Maintenance.aggregate([
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),
      byStatus: await Maintenance.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    };

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
