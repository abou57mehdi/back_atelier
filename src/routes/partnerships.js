const express = require("express");
const router = express.Router();
const Partnership = require("../models/Partnership");
const Company = require("../models/Company");
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

// GET /api/partnerships - list partnerships for user's company
router.get("/", auth, async (req, res) => {
  try {
    const { status } = req.query;

    // Get user's company
    const User = require("../models/User");
    const user = await User.findById(req.user.id).populate("company");
    if (!user || !user.company) {
      return res
        .status(400)
        .json({ error: "User must be associated with a company" });
    }

    let filter = {
      $or: [{ initiator: user.company._id }, { partner: user.company._id }],
    };

    if (status) filter.status = status;

    const partnerships = await Partnership.find(filter)
      .populate("initiator", "name")
      .populate("partner", "name")
      .sort({ createdAt: -1 });

    res.json(partnerships);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/partnerships/invite - send partnership invitation
router.post("/invite", auth, async (req, res) => {
  try {
    const {
      targetCompanyName,
      contactEmail,
      contactName,
      siret,
      message,
      equipmentAccess,
    } = req.body;

    if (!targetCompanyName || !contactEmail || !contactName) {
      return res.status(400).json({
        error:
          "Missing required fields: targetCompanyName, contactEmail, contactName",
      });
    }

    // Get user's company
    const User = require("../models/User");
    const user = await User.findById(req.user.id).populate("company");
    if (!user || !user.company) {
      return res
        .status(400)
        .json({ error: "User must be associated with a company" });
    }

    // Check if target company exists
    let targetCompany = await Company.findOne({ name: targetCompanyName });

    // If target company doesn't exist, create it as pending
    if (!targetCompany) {
      // Create a temporary user for the target company
      const User = require("../models/User");
      const bcrypt = require("bcrypt");

      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const tempUser = new User({
        username: `temp_${targetCompanyName
          .toLowerCase()
          .replace(/\s+/g, "_")}_${Date.now()}`,
        email: contactEmail,
        firstName: contactName.split(" ")[0] || contactName,
        lastName: contactName.split(" ")[1] || "",
        role: "manager",
        password: hashedPassword,
        isTemporary: true,
      });
      await tempUser.save();

      targetCompany = new Company({
        name: targetCompanyName,
        siret: siret,
        status: "pending_partnership",
        mainManager: tempUser._id,
      });
      await targetCompany.save();

      // Associate the temp user with the company
      tempUser.company = targetCompany._id;
      await tempUser.save();
    }

    // Check if partnership already exists
    const existingPartnership = await Partnership.findOne({
      $or: [
        {
          initiator: user.company._id,
          partner: targetCompany._id,
        },
        {
          initiator: targetCompany._id,
          partner: user.company._id,
        },
      ],
    });

    if (existingPartnership) {
      return res
        .status(409)
        .json({ error: "Partnership already exists or pending" });
    }

    // Create partnership invitation
    const partnership = new Partnership({
      initiator: user.company._id,
      partner: targetCompany._id,
      contactPerson: {
        name: contactName,
        email: contactEmail,
        phone: req.body.contactPhone || "",
      },
      invitationMessage: message,
      equipmentAccess: {
        allowReporting: true,
        allowViewing: true,
        restrictedEquipmentIds: [],
      },
    });

    await partnership.save();

    // TODO: Send invitation email

    res.status(201).json({
      message: "Partnership invitation sent successfully",
      partnership,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/partnerships/:id/accept - accept partnership invitation
router.put("/:id/accept", auth, async (req, res) => {
  try {
    const partnership = await Partnership.findById(req.params.id);
    if (!partnership) {
      return res.status(404).json({ error: "Partnership not found" });
    }

    if (partnership.status !== "pending") {
      return res
        .status(400)
        .json({ error: "Partnership is not in pending status" });
    }

    // Update partnership status
    partnership.status = "accepted";
    partnership.acceptedAt = new Date();
    await partnership.save();

    res.json({ message: "Partnership accepted successfully", partnership });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/partnerships/:id/reject - reject partnership invitation
router.put("/:id/reject", auth, async (req, res) => {
  try {
    const partnership = await Partnership.findById(req.params.id);
    if (!partnership) {
      return res.status(404).json({ error: "Partnership not found" });
    }

    if (partnership.status !== "pending") {
      return res
        .status(400)
        .json({ error: "Partnership is not in pending status" });
    }

    partnership.status = "rejected";
    partnership.rejectedDate = new Date();
    await partnership.save();

    res.json({ message: "Partnership rejected", partnership });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/partnerships/equipment - get accessible equipment from partners
router.get("/equipment", auth, async (req, res) => {
  try {
    // Get user's company
    const User = require("../models/User");
    const user = await User.findById(req.user.id).populate("company");
    if (!user || !user.company) {
      return res
        .status(400)
        .json({ error: "User must be associated with a company" });
    }

    // Find active partnerships where user's company is involved
    const partnerships = await Partnership.find({
      $or: [
        { initiator: user.company._id, status: "accepted" },
        { partner: user.company._id, status: "accepted" },
      ],
    }).populate("initiator partner");

    let accessibleEquipment = [];

    for (const partnership of partnerships) {
      // Determine partner company
      const partnerCompany = partnership.initiator._id.equals(user.company._id)
        ? partnership.partner
        : partnership.initiator;

      // Get equipment based on access level
      let equipmentQuery = { company: partnerCompany._id };

      if (
        partnership.equipmentAccess?.restrictedEquipmentIds &&
        partnership.equipmentAccess.restrictedEquipmentIds.length > 0
      ) {
        equipmentQuery._id = {
          $nin: partnership.equipmentAccess.restrictedEquipmentIds,
        };
      }

      if (!partnership.equipmentAccess?.allowViewing) {
        continue; // Skip this partnership
      }

      const equipment = await Equipment.find(equipmentQuery)
        .populate("company", "name")
        .select("billunId internalId licensePlate name equipmentType status");

      accessibleEquipment = accessibleEquipment.concat(
        equipment.map((eq) => ({
          ...eq.toObject(),
          partnershipId: partnership._id,
          partnerCompany: partnerCompany.name,
        }))
      );
    }

    res.json(accessibleEquipment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/partnerships/stats - partnership statistics
router.get("/stats", auth, async (req, res) => {
  try {
    // Get user's company
    const User = require("../models/User");
    const user = await User.findById(req.user.id).populate("company");
    if (!user || !user.company) {
      return res
        .status(400)
        .json({ error: "User must be associated with a company" });
    }

    const companyId = user.company._id;

    const stats = {
      activePartnerships: await Partnership.countDocuments({
        $or: [
          { initiator: companyId, status: "accepted" },
          { partner: companyId, status: "accepted" },
        ],
      }),
      pendingInvitations: await Partnership.countDocuments({
        partner: companyId,
        status: "pending",
      }),
      sentInvitations: await Partnership.countDocuments({
        initiator: companyId,
        status: "pending",
      }),
      totalSharedEquipment: 0, // Will be calculated below
      reportsReceivedViaPartners:
        await require("../models/Anomaly").countDocuments({
          reportedViaPartnership: true,
        }),
    };

    // Calculate total shared equipment
    const partnerships = await Partnership.find({
      $or: [
        { initiator: companyId, status: "accepted" },
        { partner: companyId, status: "accepted" },
      ],
    });

    for (const partnership of partnerships) {
      const partnerCompanyId = partnership.initiator.equals(companyId)
        ? partnership.partner
        : partnership.initiator;

      if (partnership.equipmentAccess?.allowViewing) {
        const count = await Equipment.countDocuments({
          company: partnerCompanyId,
        });

        // Subtract restricted equipment
        if (partnership.equipmentAccess.restrictedEquipmentIds?.length > 0) {
          const restrictedCount =
            partnership.equipmentAccess.restrictedEquipmentIds.length;
          stats.totalSharedEquipment += Math.max(0, count - restrictedCount);
        } else {
          stats.totalSharedEquipment += count;
        }
      }
    }

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
