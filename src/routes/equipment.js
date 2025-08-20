const express = require("express");
const router = express.Router();
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

// Generate Billun ID (BLN-2024-XXXXXX)
function generateBillunId() {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `BLN-${year}-${randomNum}`;
}

// GET /api/equipment - get all equipment with filters
router.get("/", auth, async (req, res) => {
  try {
    const { type, status, company, site, workshop, deadlines } = req.query;
    let filter = {};

    if (type) filter.equipmentType = type;
    if (status) filter.status = status;
    if (company) filter.company = company;
    if (site) filter.site = site;
    if (workshop) filter.workshop = workshop;

    // Filter by upcoming deadlines
    if (deadlines === "upcoming") {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      filter.$or = [
        { nextTechnicalInspection: { $lte: thirtyDaysFromNow } },
        { nextMaintenance: { $lte: thirtyDaysFromNow } },
        { nextTailgateMaintenance: { $lte: thirtyDaysFromNow } },
      ];
    }

    const equipment = await Equipment.find(filter)
      .populate("company", "name")
      .populate("site", "name")
      .populate("workshop", "name")
      .populate("assignedManager", "firstName lastName")
      .populate("assignedTeam", "firstName lastName");

    res.json(equipment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/equipment - register new equipment
router.post("/", auth, async (req, res) => {
  try {
    const equipmentData = req.body;

    // Generate unique Billun ID
    let billunId;
    let isUnique = false;
    while (!isUnique) {
      billunId = generateBillunId();
      const existing = await Equipment.findOne({ billunId });
      if (!existing) isUnique = true;
    }

    equipmentData.billunId = billunId;

    const equipment = new Equipment(equipmentData);
    await equipment.save();

    res.status(201).json({
      message: "Equipment registered successfully",
      equipment,
      billunId: billunId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/equipment/:id - get equipment details
router.get("/:id", auth, async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id)
      .populate("company", "name")
      .populate("site", "name address")
      .populate("workshop", "name teams")
      .populate("assignedManager", "firstName lastName email")
      .populate("assignedTeam", "firstName lastName role");

    if (!equipment)
      return res.status(404).json({ error: "Equipment not found" });
    res.json(equipment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/equipment/:id - update equipment
router.put("/:id", auth, async (req, res) => {
  try {
    const updates = req.body;
    const equipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );
    if (!equipment)
      return res.status(404).json({ error: "Equipment not found" });
    res.json({ message: "Equipment updated", equipment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/equipment/:id - remove equipment
router.delete("/:id", auth, async (req, res) => {
  try {
    const equipment = await Equipment.findByIdAndDelete(req.params.id);
    if (!equipment)
      return res.status(404).json({ error: "Equipment not found" });
    res.json({ message: "Equipment removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/equipment/search/:identifier - search by Billun ID, internal ID, or license plate
router.get("/search/:identifier", auth, async (req, res) => {
  try {
    const { identifier } = req.params;
    const equipment = await Equipment.findOne({
      $or: [
        { billunId: identifier },
        { internalId: identifier },
        { licensePlate: identifier },
      ],
    }).populate("company site workshop assignedManager assignedTeam");

    if (!equipment)
      return res.status(404).json({ error: "Equipment not found" });
    res.json(equipment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
