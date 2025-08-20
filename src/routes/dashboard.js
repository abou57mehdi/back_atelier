const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const Company = require("../models/Company");
const Equipment = require("../models/Equipment");
const Anomaly = require("../models/Anomaly");
const Maintenance = require("../models/Maintenance");
const Partnership = require("../models/Partnership");
const Photo = require("../models/Photo");
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

// GET /api/dashboard/overview - Main dashboard overview
router.get("/overview", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("company");
    if (!user) return res.status(404).json({ error: "User not found" });

    const companyId = user.company._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Equipment statistics
    const equipmentStats = {
      total: await Equipment.countDocuments({ company: companyId }),
      active: await Equipment.countDocuments({
        company: companyId,
        status: "active",
      }),
      maintenance: await Equipment.countDocuments({
        company: companyId,
        status: "maintenance",
      }),
      retired: await Equipment.countDocuments({
        company: companyId,
        status: "retired",
      }),
    };

    // Anomaly statistics
    const anomalyStats = {
      total: await Anomaly.countDocuments({
        equipment: {
          $in: await Equipment.find({ company: companyId }).distinct("_id"),
        },
      }),
      today: await Anomaly.countDocuments({
        equipment: {
          $in: await Equipment.find({ company: companyId }).distinct("_id"),
        },
        dateReported: { $gte: today },
      }),
      thisWeek: await Anomaly.countDocuments({
        equipment: {
          $in: await Equipment.find({ company: companyId }).distinct("_id"),
        },
        dateReported: { $gte: thisWeek },
      }),
      critical: await Anomaly.countDocuments({
        equipment: {
          $in: await Equipment.find({ company: companyId }).distinct("_id"),
        },
        criticality: "critical",
        status: { $nin: ["resolved", "closed"] },
      }),
      pending: await Anomaly.countDocuments({
        equipment: {
          $in: await Equipment.find({ company: companyId }).distinct("_id"),
        },
        status: { $in: ["reported", "in_analysis"] },
      }),
    };

    // Maintenance statistics
    const maintenanceStats = {
      scheduled: await Maintenance.countDocuments({
        equipment: {
          $in: await Equipment.find({ company: companyId }).distinct("_id"),
        },
        status: "scheduled",
      }),
      overdue: await Maintenance.countDocuments({
        equipment: {
          $in: await Equipment.find({ company: companyId }).distinct("_id"),
        },
        status: "scheduled",
        scheduledDate: { $lt: today },
      }),
      completed: await Maintenance.countDocuments({
        equipment: {
          $in: await Equipment.find({ company: companyId }).distinct("_id"),
        },
        status: "completed",
        completedDate: { $gte: thisMonth },
      }),
    };

    // Photo statistics
    const photoStats = {
      total: await Photo.countDocuments({
        relatedEquipmentId: {
          $in: await Equipment.find({ company: companyId }).distinct("_id"),
        },
      }),
      today: await Photo.countDocuments({
        relatedEquipmentId: {
          $in: await Equipment.find({ company: companyId }).distinct("_id"),
        },
        createdAt: { $gte: today },
      }),
      aiEnhanced: await Photo.countDocuments({
        relatedEquipmentId: {
          $in: await Equipment.find({ company: companyId }).distinct("_id"),
        },
        aiEnhanced: true,
      }),
    };

    // Partnership statistics
    const partnershipStats = {
      active: await Partnership.countDocuments({
        $or: [{ initiator: companyId }, { partner: companyId }],
        status: "accepted",
      }),
      pending: await Partnership.countDocuments({
        partner: companyId,
        status: "pending",
      }),
    };

    // Recent activities
    const recentAnomalies = await Anomaly.find({
      equipment: {
        $in: await Equipment.find({ company: companyId }).distinct("_id"),
      },
    })
      .populate("equipment", "billunId internalId")
      .populate("reportedBy", "firstName lastName")
      .sort({ dateReported: -1 })
      .limit(5);

    const upcomingMaintenance = await Maintenance.find({
      equipment: {
        $in: await Equipment.find({ company: companyId }).distinct("_id"),
      },
      status: "scheduled",
      scheduledDate: { $gte: today },
    })
      .populate("equipment", "billunId internalId licensePlate")
      .sort({ scheduledDate: 1 })
      .limit(5);

    res.json({
      company: {
        name: user.company.name,
        type: user.company.type,
      },
      user: {
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
      },
      stats: {
        equipment: equipmentStats,
        anomalies: anomalyStats,
        maintenance: maintenanceStats,
        photos: photoStats,
        partnerships: partnershipStats,
      },
      recentActivities: {
        anomalies: recentAnomalies,
        upcomingMaintenance,
      },
      lastUpdated: new Date(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/equipment-health - Equipment health summary
router.get("/equipment-health", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("company");
    const companyId = user.company._id;

    const equipmentHealth = await Equipment.aggregate([
      { $match: { company: companyId } },
      {
        $lookup: {
          from: "anomalies",
          localField: "_id",
          foreignField: "equipment",
          as: "anomalies",
        },
      },
      {
        $project: {
          billunId: 1,
          internalId: 1,
          licensePlate: 1,
          type: 1,
          status: 1,
          totalAnomalies: { $size: "$anomalies" },
          criticalAnomalies: {
            $size: {
              $filter: {
                input: "$anomalies",
                cond: { $eq: ["$$this.criticality", "critical"] },
              },
            },
          },
          lastAnomaly: { $max: "$anomalies.dateReported" },
          healthScore: {
            $cond: {
              if: { $eq: [{ $size: "$anomalies" }, 0] },
              then: 100,
              else: {
                $subtract: [100, { $multiply: [{ $size: "$anomalies" }, 5] }],
              },
            },
          },
        },
      },
      { $sort: { healthScore: 1 } },
    ]);

    res.json({
      equipmentHealth,
      summary: {
        totalEquipment: equipmentHealth.length,
        healthyEquipment: equipmentHealth.filter((e) => e.healthScore >= 80)
          .length,
        atRiskEquipment: equipmentHealth.filter(
          (e) => e.healthScore < 80 && e.healthScore >= 60
        ).length,
        criticalEquipment: equipmentHealth.filter((e) => e.healthScore < 60)
          .length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/analytics - Advanced analytics
router.get("/analytics", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("company");
    const companyId = user.company._id;
    const { period = "30d" } = req.query;

    let startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Anomaly trends
    const anomalyTrends = await Anomaly.aggregate([
      {
        $match: {
          equipment: {
            $in: await Equipment.find({ company: companyId }).distinct("_id"),
          },
          dateReported: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$dateReported" },
            },
            criticality: "$criticality",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    // Equipment type distribution
    const equipmentDistribution = await Equipment.aggregate([
      { $match: { company: companyId } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
        },
      },
    ]);

    // Maintenance efficiency
    const maintenanceEfficiency = await Maintenance.aggregate([
      {
        $match: {
          equipment: {
            $in: await Equipment.find({ company: companyId }).distinct("_id"),
          },
          status: "completed",
          completedDate: { $gte: startDate },
        },
      },
      {
        $project: {
          scheduledDate: 1,
          completedDate: 1,
          delayDays: {
            $divide: [
              { $subtract: ["$completedDate", "$scheduledDate"] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          averageDelay: { $avg: "$delayDays" },
          onTimeCount: {
            $sum: { $cond: [{ $lte: ["$delayDays", 0] }, 1, 0] },
          },
          totalCount: { $sum: 1 },
        },
      },
    ]);

    // Photo quality metrics
    const photoQuality = await Photo.aggregate([
      {
        $match: {
          relatedEquipmentId: {
            $in: await Equipment.find({ company: companyId }).distinct("_id"),
          },
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          averageQuality: { $avg: "$qualityScore" },
          enhancedCount: {
            $sum: { $cond: ["$aiEnhanced", 1, 0] },
          },
          totalCount: { $sum: 1 },
        },
      },
    ]);

    res.json({
      period,
      analytics: {
        anomalyTrends,
        equipmentDistribution,
        maintenanceEfficiency: maintenanceEfficiency[0] || {
          averageDelay: 0,
          onTimeCount: 0,
          totalCount: 0,
        },
        photoQuality: photoQuality[0] || {
          averageQuality: 0,
          enhancedCount: 0,
          totalCount: 0,
        },
      },
      generatedAt: new Date(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/notifications - Get notifications and alerts
router.get("/notifications", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("company");
    const companyId = user.company._id;
    const today = new Date();

    const notifications = [];

    // Critical anomalies
    const criticalAnomalies = await Anomaly.find({
      equipment: {
        $in: await Equipment.find({ company: companyId }).distinct("_id"),
      },
      criticality: "critical",
      status: { $nin: ["resolved", "closed"] },
    }).populate("equipment", "billunId internalId");

    criticalAnomalies.forEach((anomaly) => {
      notifications.push({
        type: "critical",
        priority: "high",
        title: "Critical Anomaly",
        message: `Critical anomaly on equipment ${
          anomaly.equipment.billunId || anomaly.equipment.internalId
        }`,
        link: `/anomalies/${anomaly._id}`,
        createdAt: anomaly.dateReported,
      });
    });

    // Overdue maintenance
    const overdueMaintenance = await Maintenance.find({
      equipment: {
        $in: await Equipment.find({ company: companyId }).distinct("_id"),
      },
      status: "scheduled",
      scheduledDate: { $lt: today },
    }).populate("equipment", "billunId internalId");

    overdueMaintenance.forEach((maintenance) => {
      const daysPast = Math.floor(
        (today - maintenance.scheduledDate) / (1000 * 60 * 60 * 24)
      );
      notifications.push({
        type: "maintenance",
        priority: daysPast > 7 ? "high" : "medium",
        title: "Overdue Maintenance",
        message: `Maintenance overdue by ${daysPast} days for ${
          maintenance.equipment.billunId || maintenance.equipment.internalId
        }`,
        link: `/maintenance/${maintenance._id}`,
        createdAt: maintenance.scheduledDate,
      });
    });

    // Pending partnership invitations
    const pendingPartnerships = await Partnership.find({
      partner: companyId,
      status: "pending",
    }).populate("initiator", "name");

    pendingPartnerships.forEach((partnership) => {
      notifications.push({
        type: "partnership",
        priority: "medium",
        title: "Partnership Invitation",
        message: `New partnership invitation from ${partnership.initiator.name}`,
        link: `/partnerships/${partnership._id}`,
        createdAt: partnership.createdAt,
      });
    });

    // Sort by priority and date
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    notifications.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({
      notifications,
      counts: {
        total: notifications.length,
        high: notifications.filter((n) => n.priority === "high").length,
        medium: notifications.filter((n) => n.priority === "medium").length,
        low: notifications.filter((n) => n.priority === "low").length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
