const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Company = require("../models/Company");
const ContactMessage = require("../models/ContactMessage");
const Equipment = require("../models/Equipment");
const Anomaly = require("../models/Anomaly");
const Photo = require("../models/Photo");
const Partnership = require("../models/Partnership");

// --- ANALYTICS ENDPOINTS ---
// GET /api/admin/analytics/users-per-month
router.get("/analytics/users-per-month", adminAuth, async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    // Format for frontend: [{ month: 'Jan', count: 10 }, ...]
    const months = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Juin",
      "Juil",
      "Août",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ];
    const result = Array(12)
      .fill(0)
      .map((_, i) => ({ month: months[i], count: 0 }));
    const now = new Date();
    users.forEach((u) => {
      if (u._id.year === now.getFullYear()) {
        result[u._id.month - 1].count = u.count;
      }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/analytics/photos-per-month
router.get("/analytics/photos-per-month", adminAuth, async (req, res) => {
  try {
    const photos = await Photo.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    const months = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Juin",
      "Juil",
      "Août",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ];
    const result = Array(12)
      .fill(0)
      .map((_, i) => ({ month: months[i], count: 0 }));
    const now = new Date();
    photos.forEach((p) => {
      if (p._id.year === now.getFullYear()) {
        result[p._id.month - 1].count = p.count;
      }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/analytics/partnerships-per-month
router.get("/analytics/partnerships-per-month", adminAuth, async (req, res) => {
  try {
    const partnerships = await Partnership.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    const months = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Juin",
      "Juil",
      "Août",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ];
    const result = Array(12)
      .fill(0)
      .map((_, i) => ({ month: months[i], count: 0 }));
    const now = new Date();
    partnerships.forEach((p) => {
      if (p._id.year === now.getFullYear()) {
        result[p._id.month - 1].count = p.count;
      }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/analytics/anomalies-per-month
router.get("/analytics/anomalies-per-month", adminAuth, async (req, res) => {
  try {
    const anomalies = await Anomaly.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    const months = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Juin",
      "Juil",
      "Août",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ];
    const result = Array(12)
      .fill(0)
      .map((_, i) => ({ month: months[i], count: 0 }));
    const now = new Date();
    anomalies.forEach((a) => {
      if (a._id.year === now.getFullYear()) {
        result[a._id.month - 1].count = a.count;
      }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// JWT middleware with admin role check
function adminAuth(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token" });

    try {
      const user = await User.findById(decoded.id);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      req.user = decoded;
      req.userDoc = user;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid token" });
    }
  });
}

// GET /api/admin/dashboard - Admin overview dashboard
router.get("/dashboard", adminAuth, async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Contact message statistics
    const contactStats = {
      total: await ContactMessage.countDocuments(),
      new: await ContactMessage.countDocuments({ status: "new" }),
      thisWeek: await ContactMessage.countDocuments({
        createdAt: { $gte: sevenDaysAgo },
      }),
      thisMonth: await ContactMessage.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      }),
      converted: await ContactMessage.countDocuments({ status: "converted" }),
      pending: await ContactMessage.countDocuments({
        status: { $in: ["new", "contacted", "in_progress"] },
      }),
    };

    // Company statistics
    const companyStats = {
      total: await Company.countDocuments(),
      thisWeek: await Company.countDocuments({
        createdAt: { $gte: sevenDaysAgo },
      }),
      thisMonth: await Company.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      }),
    };

    // User statistics
    const userStats = {
      total: await User.countDocuments(),
      managers: await User.countDocuments({ role: "manager" }),
      drivers: await User.countDocuments({ role: "driver" }),
      workshops: await User.countDocuments({ role: "workshop" }),
      admins: await User.countDocuments({ role: "admin" }),
      active: await User.countDocuments({ status: "active" }),
      lastWeek: await User.countDocuments({
        lastLogin: { $gte: sevenDaysAgo },
      }),
    };

    // Equipment statistics (system-wide)
    const equipmentStats = {
      total: await Equipment.countDocuments(),
      active: await Equipment.countDocuments({ status: "active" }),
      maintenance: await Equipment.countDocuments({ status: "maintenance" }),
      retired: await Equipment.countDocuments({ status: "retired" }),
    };

    // Anomaly statistics (system-wide)
    const anomalyStats = {
      total: await Anomaly.countDocuments(),
      critical: await Anomaly.countDocuments({ criticality: "critical" }),
      pending: await Anomaly.countDocuments({
        status: { $nin: ["resolved", "closed"] },
      }),
      thisWeek: await Anomaly.countDocuments({
        dateReported: { $gte: sevenDaysAgo },
      }),
    };

    // Recent contact messages
    const recentContacts = await ContactMessage.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("assignedTo", "firstName lastName");

    // Recent companies
    const recentCompanies = await Company.find()
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      admin: {
        name: `${req.userDoc.firstName} ${req.userDoc.lastName}`,
        email: req.userDoc.email,
      },
      stats: {
        contacts: contactStats,
        companies: companyStats,
        users: userStats,
        equipment: equipmentStats,
        anomalies: anomalyStats,
      },
      recentActivities: {
        contacts: recentContacts,
        companies: recentCompanies,
      },
      lastUpdated: new Date(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/contacts - List all contact messages
router.get("/contacts", adminAuth, async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 20, search } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }
    if (priority && priority !== "all") {
      filter.priority = priority;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const contacts = await ContactMessage.find(filter)
      .populate("assignedTo", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ContactMessage.countDocuments(filter);

    res.json({
      contacts,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalRecords: total,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/contacts/:id - Update contact message
router.put("/contacts/:id", adminAuth, async (req, res) => {
  try {
    const { status, priority, notes, assignedTo } = req.body;
    const updateData = {};

    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (notes !== undefined) updateData.notes = notes;
    if (assignedTo) updateData.assignedTo = assignedTo;

    // Set response date when first contacted
    if (status === "contacted" || status === "in_progress") {
      updateData.responseDate = new Date();
    }

    // Set conversion date when converted
    if (status === "converted") {
      updateData.conversionDate = new Date();
    }

    const contact = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate("assignedTo", "firstName lastName email");

    if (!contact) {
      return res.status(404).json({ error: "Contact message not found" });
    }

    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/contacts/:id - Delete contact message
router.delete("/contacts/:id", adminAuth, async (req, res) => {
  try {
    const contact = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!contact) {
      return res.status(404).json({ error: "Contact message not found" });
    }
    res.json({ message: "Contact message deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/companies - List all companies
router.get("/companies", adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { siret: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { sector: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const companies = await Company.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Company.countDocuments(filter);

    // Get user counts for each company
    const companiesWithStats = await Promise.all(
      companies.map(async (company) => {
        const userCount = await User.countDocuments({ company: company._id });
        const equipmentCount = await Equipment.countDocuments({
          company: company._id,
        });
        return {
          ...company.toObject(),
          userCount,
          equipmentCount,
        };
      })
    );

    res.json({
      companies: companiesWithStats,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalRecords: total,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/companies - Create new company
router.post("/companies", adminAuth, async (req, res) => {
  try {
    const {
      name,
      siret,
      address,
      phone,
      email,
      sector,
      type = "client",
      managerData,
    } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res
        .status(400)
        .json({ error: "Company name and email are required" });
    }

    // Check if company already exists
    const existingCompany = await Company.findOne({
      $or: [{ email }, { siret: siret || "" }],
    });

    if (existingCompany) {
      return res
        .status(400)
        .json({ error: "Company with this email or SIRET already exists" });
    }

    // Create company
    const company = new Company({
      name,
      siret,
      address,
      phone,
      email,
      sector,
      type,
      status: "active",
    });

    await company.save();

    // Create manager user if provided
    if (
      managerData &&
      managerData.firstName &&
      managerData.lastName &&
      managerData.email
    ) {
      const bcrypt = require("bcryptjs");
      const defaultPassword = "billun123"; // Temporary password
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      const manager = new User({
        firstName: managerData.firstName,
        lastName: managerData.lastName,
        email: managerData.email,
        phone: managerData.phone || "",
        role: "manager",
        password: hashedPassword,
        company: company._id,
        isTemporary: true, // Flag for password change on first login
      });

      await manager.save();

      res.status(201).json({
        message: "Company and manager created successfully",
        company,
        manager: {
          id: manager._id,
          firstName: manager.firstName,
          lastName: manager.lastName,
          email: manager.email,
          defaultPassword,
        },
      });
    } else {
      res.status(201).json({
        message: "Company created successfully",
        company,
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users - List all users across companies
router.get("/users", adminAuth, async (req, res) => {
  try {
    const { role, company, page = 1, limit = 50, search } = req.query;
    const filter = {};

    if (role && role !== "all") {
      filter.role = role;
    }
    if (company) {
      filter.company = company;
    }
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const users = await User.find(filter)
      .populate("company", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("-password");

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalRecords: total,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/companies/:id - Update company
router.put("/companies/:id", adminAuth, async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/companies/:id - Delete company (soft delete)
router.delete("/companies/:id", adminAuth, async (req, res) => {
  try {
    // Check if company has users or equipment
    const userCount = await User.countDocuments({ company: req.params.id });
    const equipmentCount = await Equipment.countDocuments({
      company: req.params.id,
    });

    if (userCount > 0 || equipmentCount > 0) {
      return res.status(400).json({
        error:
          "Cannot delete company with existing users or equipment. Please transfer or remove them first.",
      });
    }

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { status: "deleted" },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json({ message: "Company deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
