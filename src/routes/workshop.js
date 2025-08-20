const express = require("express");
const router = express.Router();
const Anomaly = require("../models/Anomaly");
const Equipment = require("../models/Equipment");
const User = require("../models/User");
const Maintenance = require("../models/Maintenance");
const Workshop = require("../models/Workshop");
const { auth, requireRole } = require("../middleware/auth");

// Generate Billun ID (BLN-2024-XXXXXX)
function generateBillunId() {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `BLN-${year}-${randomNum}`;
}

// Apply authentication and workshop role requirement
router.use(auth);
router.use(requireRole(["workshop", "admin"]));

// ===== ANOMALIES ENDPOINTS =====

// Get all anomalies for workshop
router.get("/anomalies", async (req, res) => {
  try {
    const { priority, status, limit = 50 } = req.query;

    let query = {};

    // Filter by priority if specified
    if (priority) {
      query.criticality = priority;
    }

    // Filter by status if specified
    if (status) {
      query.status = status;
    }

    const anomalies = await Anomaly.find(query)
      .populate("equipment", "billunId licensePlate name currentMileage")
      .populate("reportedBy", "firstName lastName email")
      .populate("assignedTo", "firstName lastName")
      .sort({ dateReported: -1 })
      .limit(parseInt(limit));

    res.json(anomalies);
  } catch (error) {
    console.error("Error fetching anomalies:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get urgent anomalies only
router.get("/anomalies/urgent", async (req, res) => {
  try {
    const urgentAnomalies = await Anomaly.find({
      criticality: { $in: ["critical", "important"] },
      status: { $in: ["reported", "in_analysis", "scheduled", "in_progress"] },
    })
      .populate("equipment", "billunId licensePlate name currentMileage")
      .populate("reportedBy", "firstName lastName email")
      .populate("assignedTo", "firstName lastName")
      .sort({ criticality: 1, dateReported: -1 })
      .limit(20);

    res.json(urgentAnomalies);
  } catch (error) {
    console.error("Error fetching urgent anomalies:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific anomaly details
router.get("/anomalies/:id", async (req, res) => {
  try {
    const anomaly = await Anomaly.findById(req.params.id)
      .populate("equipment")
      .populate("reportedBy", "firstName lastName email phone")
      .populate("assignedTo", "firstName lastName email phone")
      .populate("maintenanceTask");

    if (!anomaly) {
      return res.status(404).json({ error: "Anomaly not found" });
    }

    res.json(anomaly);
  } catch (error) {
    console.error("Error fetching anomaly:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create new anomaly report
router.post("/anomalies", async (req, res) => {
  try {
    const {
      equipmentId,
      titre,
      description,
      criticality,
      immobilizationStatus,
      location,
      problemType,
      photos,
    } = req.body;

    // Verify equipment exists
    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      return res.status(404).json({ error: "Equipment not found" });
    }

    const anomaly = new Anomaly({
      equipment: equipmentId,
      reportedBy: req.user.id,
      titre,
      description,
      criticality,
      immobilizationStatus,
      location,
      problemType,
      photos: photos || [],
      status: "reported",
    });

    await anomaly.save();

    // Populate the response
    await anomaly.populate("equipment", "billunId licensePlate name");
    await anomaly.populate("reportedBy", "firstName lastName");

    res.status(201).json(anomaly);
  } catch (error) {
    console.error("Error creating anomaly:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update anomaly status/notes
router.put("/anomalies/:id", async (req, res) => {
  try {
    const {
      status,
      analysisNotes,
      resolutionNotes,
      assignedTo,
      estimatedRepairCost,
    } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (analysisNotes) updateData.analysisNotes = analysisNotes;
    if (resolutionNotes) updateData.resolutionNotes = resolutionNotes;
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (estimatedRepairCost)
      updateData.estimatedRepairCost = estimatedRepairCost;

    // Set timestamps based on status
    if (status === "in_analysis") updateData.dateAnalyzed = new Date();
    if (status === "resolved") updateData.dateResolved = new Date();

    const anomaly = await Anomaly.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    })
      .populate("equipment", "billunId licensePlate name")
      .populate("reportedBy", "firstName lastName")
      .populate("assignedTo", "firstName lastName");

    if (!anomaly) {
      return res.status(404).json({ error: "Anomaly not found" });
    }

    res.json(anomaly);
  } catch (error) {
    console.error("Error updating anomaly:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== PHOTOS ENDPOINTS =====

// Get recent photos
router.get("/photos/recent", async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const anomalies = await Anomaly.find({
      "photos.0": { $exists: true },
    })
      .populate("equipment", "billunId licensePlate name")
      .populate("reportedBy", "firstName lastName")
      .sort({ dateReported: -1 })
      .limit(parseInt(limit));

    // Extract photos with context
    const recentPhotos = [];
    anomalies.forEach((anomaly) => {
      anomaly.photos.forEach((photo) => {
        recentPhotos.push({
          id: photo._id,
          url: photo.url,
          filename: photo.filename,
          timestamp: photo.geolocation?.timestamp || anomaly.dateReported,
          anomalyId: anomaly._id,
          equipment: anomaly.equipment,
          reportedBy: anomaly.reportedBy,
          criticality: anomaly.criticality,
        });
      });
    });

    // Sort by timestamp and limit
    recentPhotos.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(recentPhotos.slice(0, parseInt(limit)));
  } catch (error) {
    console.error("Error fetching recent photos:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== MAINTENANCE SCHEDULING ENDPOINTS =====

// GET /api/workshop/maintenance - Get maintenance schedule
router.get("/maintenance", async (req, res) => {
  try {
    const { month, year, equipmentId } = req.query;

    // Build query for maintenance events
    let query = {};

    if (equipmentId) {
      query.equipment = equipmentId;
    }

    // If month/year specified, filter by date range
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);

      query.$or = [
        {
          scheduledDate: {
            $gte: startDate,
            $lte: endDate,
          },
        },
        {
          nextMaintenanceDate: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      ];
    }

    // Get maintenance records from anomalies (scheduled maintenance)
    const maintenanceAnomalies = await Anomaly.find({
      status: { $in: ["scheduled", "in_progress"] },
      ...query,
    }).populate("equipment", "name billunId licensePlate");

    // Get equipment with upcoming maintenance
    const equipmentQuery = {};
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);

      equipmentQuery.nextMaintenanceDate = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const equipmentMaintenance = await Equipment.find(equipmentQuery);

    // Combine and format maintenance events
    const maintenanceEvents = [];

    // Add anomaly-based maintenance
    maintenanceAnomalies.forEach((anomaly) => {
      maintenanceEvents.push({
        id: anomaly._id,
        type: "maintenance",
        title: anomaly.titre,
        description: anomaly.description,
        date: anomaly.scheduledDate || new Date(),
        equipment: anomaly.equipment,
        status: anomaly.status,
        criticality: anomaly.criticality,
      });
    });

    // Add equipment-based maintenance
    equipmentMaintenance.forEach((equipment) => {
      if (equipment.nextMaintenanceDate) {
        maintenanceEvents.push({
          id: `equipment_${equipment._id}`,
          type: "maintenance",
          title: `Entretien ${equipment.billunId}`,
          description: "Entretien préventif programmé",
          date: equipment.nextMaintenanceDate,
          equipment: {
            _id: equipment._id,
            name: equipment.name,
            billunId: equipment.billunId,
            licensePlate: equipment.licensePlate,
          },
          status: "scheduled",
          criticality: "normal",
        });
      }

      // Add technical control if due
      if (equipment.nextTechnicalInspection) {
        maintenanceEvents.push({
          id: `control_${equipment._id}`,
          type: "control",
          title: `CT ${equipment.billunId}`,
          description: "Contrôle technique",
          date: equipment.nextTechnicalInspection,
          equipment: {
            _id: equipment._id,
            name: equipment.name,
            billunId: equipment.billunId,
            licensePlate: equipment.licensePlate,
          },
          status: "scheduled",
          criticality: "important",
        });
      }
    });

    // Sort by date
    maintenanceEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(maintenanceEvents);
  } catch (error) {
    console.error("Error fetching maintenance schedule:", error);
    res.status(500).json({ error: "Failed to fetch maintenance schedule" });
  }
});

// POST /api/workshop/maintenance - Schedule new maintenance
router.post("/maintenance", async (req, res) => {
  try {
    const {
      equipmentId,
      title,
      description,
      scheduledDate,
      type = "maintenance",
      criticality = "normal",
    } = req.body;

    // Validate required fields
    if (!equipmentId || !title || !scheduledDate) {
      return res.status(400).json({
        error: "Missing required fields: equipmentId, title, scheduledDate",
      });
    }

    // Create maintenance as an anomaly with scheduled status
    const maintenanceData = {
      equipment: equipmentId,
      titre: title,
      description: description || "Maintenance programmée",
      criticality,
      location: "Atelier",
      problemType: type === "control" ? "inspection" : "maintenance",
      status: "scheduled",
      scheduledDate: new Date(scheduledDate),
      immobilizationStatus: "operational",
      reportedBy: req.user.id,
    };

    const maintenance = new Anomaly(maintenanceData);
    await maintenance.save();

    // Populate equipment data
    await maintenance.populate("equipment", "name billunId licensePlate");

    res.status(201).json({
      message: "Maintenance scheduled successfully",
      maintenance,
    });
  } catch (error) {
    console.error("Error scheduling maintenance:", error);
    res.status(500).json({ error: "Failed to schedule maintenance" });
  }
});

// ===== STATISTICS ENDPOINTS =====

// Get anomaly statistics
router.get("/stats/anomalies", async (req, res) => {
  try {
    const stats = await Promise.all([
      // Total anomalies
      Anomaly.countDocuments(),

      // Urgent anomalies
      Anomaly.countDocuments({
        criticality: { $in: ["critical", "important"] },
        status: {
          $in: ["reported", "in_analysis", "scheduled", "in_progress"],
        },
      }),

      // Resolved this month
      Anomaly.countDocuments({
        status: "resolved",
        dateResolved: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),

      // In progress
      Anomaly.countDocuments({
        status: { $in: ["in_analysis", "scheduled", "in_progress"] },
      }),

      // By criticality
      Anomaly.aggregate([
        { $group: { _id: "$criticality", count: { $sum: 1 } } },
      ]),

      // By status
      Anomaly.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    res.json({
      total: stats[0],
      urgent: stats[1],
      resolvedThisMonth: stats[2],
      inProgress: stats[3],
      byCriticality: stats[4],
      byStatus: stats[5],
    });
  } catch (error) {
    console.error("Error fetching anomaly stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== EQUIPMENT ENDPOINTS =====

// Get all equipment for workshop
router.get("/equipment", async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;

    let query = {};
    if (status) {
      query.status = status;
    }

    const equipment = await Equipment.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(equipment);
  } catch (error) {
    console.error("Error fetching equipment:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/workshop/equipment - Create new equipment
router.post("/equipment", async (req, res) => {
  try {
    const {
      internalId,
      name,
      type,
      category,
      licensePlate,
      brand,
      model,
      year,
      currentMileage,
      fuel,
      emptyWeight,
      depot,
      status = "active",
      nextTechnicalControl,
      // Special equipment flags
      adrPlate,
      hayon,
      frigo,
      grue,
      benne,
      chrono,
    } = req.body;

    // Validate required fields
    if (!name || !category) {
      return res.status(400).json({
        error: "Missing required fields: name, category",
      });
    }

    // Generate Billun ID if not provided
    const billunId = internalId || generateBillunId();

    // Check if billunId already exists
    const existingEquipment = await Equipment.findOne({ billunId });
    if (existingEquipment) {
      return res.status(400).json({
        error: "Equipment with this ID already exists",
      });
    }

    // Map category to equipmentType
    const getEquipmentType = (category) => {
      switch (category) {
        case "vehicule":
        case "camion":
          return "vehicle";
        case "remorque":
          return "trailer";
        case "manutention":
          return "handling";
        default:
          return "vehicle"; // Default fallback
      }
    };

    // Map type to specific vehicle/trailer/handling type
    const getSpecificType = (category, type) => {
      if (category === "vehicule" || category === "camion") {
        switch (type) {
          case "camion":
          case "porteur":
            return "truck";
          case "tracteur":
            return "road_tractor";
          case "utilitaire":
            return "van";
          case "voiture":
            return "car";
          default:
            return "truck";
        }
      }
      return undefined;
    };

    // Create equipment object matching the schema
    const equipmentData = {
      billunId,
      name,
      licensePlate,
      brand,
      model,
      yearOfService: year ? parseInt(year) : undefined,
      currentMileage: currentMileage ? parseInt(currentMileage) : 0,
      emptyWeight: emptyWeight ? parseInt(emptyWeight) : undefined,
      equipmentType: getEquipmentType(category),
      vehicleType: getSpecificType(category, type),
      fuelType: fuel,
      nextTechnicalInspection: nextTechnicalControl
        ? new Date(nextTechnicalControl)
        : undefined,
      status: status === "active" ? "available" : status,
      // Map special equipment to schema fields
      adrPlate: !!adrPlate,
      tailgateLift: !!hayon,
      // Store other special equipment in customFields
      customFields: {
        frigo: frigo ? "true" : "false",
        grue: grue ? "true" : "false",
        benne: benne ? "true" : "false",
        chrono: chrono ? "true" : "false",
        depot: depot || "",
      },
    };

    console.log("Creating equipment with data:", equipmentData);

    const equipment = new Equipment(equipmentData);
    await equipment.save();

    console.log("Equipment created successfully:", equipment._id);

    res.status(201).json({
      message: "Equipment created successfully",
      equipment,
    });
  } catch (error) {
    console.error("Error creating equipment:", error);
    res.status(500).json({
      error: "Failed to create equipment",
      details: error.message,
    });
  }
});

// Update equipment status
router.put("/equipment/:id/status", async (req, res) => {
  try {
    const { status, availability } = req.body;

    const updateData = {
      lastStatusUpdate: new Date(),
    };

    if (status !== undefined) {
      updateData.status = status;
    }

    if (availability !== undefined) {
      updateData.availability = availability;
    }

    const equipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!equipment) {
      return res.status(404).json({ error: "Equipment not found" });
    }

    res.json({
      message: "Equipment status updated successfully",
      equipment,
    });
  } catch (error) {
    console.error("Error updating equipment status:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== PERSONNEL ENDPOINTS =====

// Get workshop personnel
router.get("/personnel", async (req, res) => {
  try {
    const personnel = await User.find({
      role: { $in: ["workshop", "atelier"] },
    }).select("-password");

    res.json(personnel);
  } catch (error) {
    console.error("Error fetching personnel:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/workshop/personnel - Create new personnel
router.post("/personnel", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      role = "workshop",
      specializations,
      experience,
      certifications,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        error: "Missing required fields: firstName, lastName, email",
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        error: "User with this email already exists",
      });
    }

    // Create user object
    const userData = {
      firstName,
      lastName,
      email,
      phone,
      role,
      specializations: specializations
        ? specializations.split(",").map((s) => s.trim())
        : [],
      experience,
      certifications: certifications
        ? certifications.split(",").map((c) => c.trim())
        : [],
      availability: true,
      currentTask: null,
      password: await require("bcryptjs").hash("defaultPassword123", 10), // Default password
      createdAt: new Date(),
    };

    const user = new User(userData);
    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: "Personnel created successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Error creating personnel:", error);
    res.status(500).json({ error: "Failed to create personnel" });
  }
});

// Update personnel availability
router.put("/personnel/:id/availability", async (req, res) => {
  try {
    const { availability } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { availability },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "Personnel not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error updating availability:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== MAINTENANCE ENDPOINTS =====

// Get maintenance tasks
router.get("/maintenance", async (req, res) => {
  try {
    const { status, equipment } = req.query;

    let query = {};
    if (status) query.status = status;
    if (equipment) query.equipment = equipment;

    const maintenance = await Maintenance.find(query)
      .populate("equipment", "billunId name licensePlate")
      .populate("assignedTo", "firstName lastName")
      .sort({ scheduledDate: 1 });

    res.json(maintenance);
  } catch (error) {
    console.error("Error fetching maintenance:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create maintenance task
router.post("/maintenance", async (req, res) => {
  try {
    const maintenanceData = {
      ...req.body,
      createdBy: req.user.id,
    };

    const maintenance = new Maintenance(maintenanceData);
    await maintenance.save();

    await maintenance.populate("equipment", "billunId name licensePlate");
    await maintenance.populate("assignedTo", "firstName lastName");

    res.status(201).json(maintenance);
  } catch (error) {
    console.error("Error creating maintenance:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
