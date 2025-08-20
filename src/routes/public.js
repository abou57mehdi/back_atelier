const express = require("express");
const router = express.Router();
const ContactMessage = require("../models/ContactMessage");

// POST /api/public/contact - Submit contact form
router.post("/contact", async (req, res) => {
  try {
    const {
      name,
      email,
      company,
      phone,
      message,
      source = "website",
    } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        error: "Name, email, and message are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Please provide a valid email address",
      });
    }

    // Auto-assign priority based on keywords
    let priority = "medium";
    const urgentKeywords = [
      "urgent",
      "emergency",
      "critical",
      "asap",
      "immediately",
    ];
    const highPriorityKeywords = ["important", "priority", "soon", "quick"];

    const messageText = message.toLowerCase();
    if (urgentKeywords.some((keyword) => messageText.includes(keyword))) {
      priority = "high";
    } else if (
      highPriorityKeywords.some((keyword) => messageText.includes(keyword))
    ) {
      priority = "medium";
    }

    // Create contact message
    const contactMessage = new ContactMessage({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      company: company?.trim() || "",
      phone: phone?.trim() || "",
      message: message.trim(),
      priority,
      source,
    });

    await contactMessage.save();

    // Log for admin notification (in production, this would trigger email/SMS)
    console.log(`New contact message received from ${name} (${email})`);

    res.status(201).json({
      message: "Contact message sent successfully. We'll get back to you soon!",
      id: contactMessage._id,
      status: "received",
    });
  } catch (err) {
    console.error("Contact form error:", err);
    res.status(500).json({
      error:
        "Sorry, there was an error sending your message. Please try again.",
    });
  }
});

// GET /api/public/info - Basic company information for public display
router.get("/info", async (req, res) => {
  try {
    res.json({
      company: {
        name: "Billun",
        tagline: "Equipment Management & Anomaly Tracking System",
        description:
          "Professional equipment management solution for workshops, fleets, and maintenance teams.",
        services: [
          "Equipment tracking and monitoring",
          "Anomaly detection and reporting",
          "Maintenance scheduling",
          "Mobile inspection app",
          "Real-time dashboards",
          "Partnership management",
        ],
        contact: {
          email: "contact@billun.fr",
          phone: "+33 1 23 45 67 89",
          address: "Paris, France",
        },
      },
      stats: {
        equipmentTracked: "1000+",
        companiesServed: "50+",
        anomaliesDetected: "5000+",
        uptime: "99.9%",
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Unable to fetch company information" });
  }
});

// GET /api/public/status - System status for public display
router.get("/status", async (req, res) => {
  try {
    res.json({
      status: "operational",
      version: "1.0.0",
      lastUpdated: new Date(),
      services: {
        api: "operational",
        database: "operational",
        fileStorage: "operational",
        mobile: "operational",
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "degraded",
      error: "Status check failed",
    });
  }
});

module.exports = router;
