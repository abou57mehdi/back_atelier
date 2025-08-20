const express = require("express");
const router = express.Router();
const Anomaly = require("../models/Anomaly");
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

// GET /api/anomalies - get all anomalies with filters
router.get("/", auth, async (req, res) => {
  try {
    const { status, criticality, date, equipment, reporter } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (criticality) filter.criticality = criticality;
    if (equipment) filter.equipment = equipment;
    if (reporter) filter.reportedBy = reporter;

    // Date filters
    if (date === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      filter.dateReported = { $gte: today, $lt: tomorrow };
    } else if (date === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filter.dateReported = { $gte: weekAgo };
    }

    const anomalies = await Anomaly.find(filter)
      .populate("equipment", "billunId internalId licensePlate")
      .populate("reportedBy", "firstName lastName role")
      .populate("assignedTo", "firstName lastName")
      .populate("partnerCompany", "name")
      .sort({ dateReported: -1 });

    res.json(anomalies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/anomalies - report new anomaly
router.post("/", auth, async (req, res) => {
  try {
    const {
      equipmentId,
      description,
      criticality,
      immobilizationStatus,
      photos,
      location,
    } = req.body;

    // Validate equipment exists
    const equipment = await Equipment.findById(equipmentId);
    if (!equipment)
      return res.status(404).json({ error: "Equipment not found" });

    // Validate minimum photos requirement
    if (!photos || photos.length < 4) {
      return res.status(400).json({ error: "Minimum 4 photos required" });
    }

    const anomaly = new Anomaly({
      equipment: equipmentId,
      reportedBy: req.user.id,
      description,
      criticality,
      immobilizationStatus,
      photos,
      location,
      reportLocation: req.body.reportLocation,
    });

    await anomaly.save();

    res.status(201).json({
      message: "Anomaly reported successfully",
      anomaly,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/anomalies/:id - get anomaly details
router.get("/:id", auth, async (req, res) => {
  try {
    const anomaly = await Anomaly.findById(req.params.id)
      .populate("equipment")
      .populate("reportedBy", "firstName lastName email role")
      .populate("assignedTo", "firstName lastName email")
      .populate("partnerCompany", "name")
      .populate("maintenanceTask");

    if (!anomaly) return res.status(404).json({ error: "Anomaly not found" });
    res.json(anomaly);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/anomalies/:id - update anomaly status/diagnosis
router.put("/:id", auth, async (req, res) => {
  try {
    const updates = req.body;

    // Update analysis/resolution timestamps
    if (updates.status === "in_analysis" && !updates.dateAnalyzed) {
      updates.dateAnalyzed = new Date();
    }
    if (updates.status === "resolved" && !updates.dateResolved) {
      updates.dateResolved = new Date();
    }

    const anomaly = await Anomaly.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    if (!anomaly) return res.status(404).json({ error: "Anomaly not found" });

    res.json({ message: "Anomaly updated", anomaly });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/anomalies/stats/dashboard - dashboard statistics
router.get("/stats/dashboard", auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      total: await Anomaly.countDocuments(),
      critical: await Anomaly.countDocuments({ criticality: "critical" }),
      pending: await Anomaly.countDocuments({
        status: { $in: ["reported", "in_analysis"] },
      }),
      todayReports: await Anomaly.countDocuments({
        dateReported: { $gte: today },
      }),
      byStatus: await Anomaly.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      byCriticality: await Anomaly.aggregate([
        { $group: { _id: "$criticality", count: { $sum: 1 } } },
      ]),
      byProblemType: await Anomaly.aggregate([
        { $group: { _id: "$problemType", count: { $sum: 1 } } },
      ]),
    };

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/anomalies/partner - report anomaly on partner equipment
router.post("/partner", auth, async (req, res) => {
  try {
    const {
      equipmentId,
      description,
      criticality,
      immobilizationStatus,
      photos,
      location,
      partnershipId,
    } = req.body;

    // Validate equipment exists and partnership access
    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      return res.status(404).json({ error: "Equipment not found" });
    }

    // Validate partnership access
    const Partnership = require("../models/Partnership");
    const User = require("../models/User");

    const user = await User.findById(req.user.id).populate("company");
    const partnership = await Partnership.findById(partnershipId);

    if (!partnership || partnership.status !== "active") {
      return res.status(403).json({ error: "Invalid or inactive partnership" });
    }

    // Check if user's company has access to this equipment
    const hasAccess =
      (partnership.requestingCompany.equals(user.company._id) ||
        partnership.targetCompany.equals(user.company._id)) &&
      equipment.company.equals(
        partnership.requestingCompany.equals(user.company._id)
          ? partnership.targetCompany
          : partnership.requestingCompany
      );

    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: "No access to this equipment via partnership" });
    }

    // Validate minimum photos requirement
    if (!photos || photos.length < 4) {
      return res.status(400).json({ error: "Minimum 4 photos required" });
    }

    const anomaly = new Anomaly({
      equipment: equipmentId,
      reportedBy: req.user.id,
      description,
      criticality,
      immobilizationStatus,
      photos,
      location,
      reportLocation: req.body.reportLocation,
      reportedViaPartnership: true,
      partnerCompany: user.company._id,
      partnership: partnershipId,
    });

    await anomaly.save();

    // Update partnership metrics
    partnership.sharedAnomalies += 1;
    partnership.lastActivity = new Date();
    await partnership.save();

    res.status(201).json({
      message: "Partner anomaly reported successfully",
      anomaly,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
