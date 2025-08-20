const mongoose = require("mongoose");

const PhotoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  filename: { type: String },
  geolocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    timestamp: { type: Date, default: Date.now },
  },
  aiEnhanced: { type: Boolean, default: false },
  metadata: { type: Map, of: String },
});

const AnomalySchema = new mongoose.Schema(
  {
    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    titre: { type: String, required: true },
    description: { type: String, required: true },
    immobilizationStatus: {
      type: String,
      enum: ["mobile", "immobilized", "limited_use"],
      default: "mobile",
    },

    // Photo management
    photos: [PhotoSchema],
    minimumPhotos: { type: Number, default: 4 },

    // Criticality and diagnosis
    criticality: {
      type: String,
      enum: ["ok", "minor", "important", "critical"],
      required: true,
      default: "ok",
    },
    initialDiagnosis: {
      type: String,
      enum: ["to_analyze", "planned", "completed", "critical"],
      default: "to_analyze",
    },

    // Location and context
    location: { type: String },
    reportLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String },
    },

    // Timestamps
    dateReported: { type: Date, default: Date.now },
    dateAnalyzed: { type: Date },
    dateResolved: { type: Date },

    // Workflow status
    status: {
      type: String,
      enum: [
        "reported",
        "in_analysis",
        "scheduled",
        "in_progress",
        "resolved",
        "closed",
      ],
      default: "reported",
    },

    // Partnership context
    reportedViaPartnership: { type: Boolean, default: false },
    partnerCompany: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    partnership: { type: mongoose.Schema.Types.ObjectId, ref: "Partnership" },

    // Analysis and resolution
    analysisNotes: { type: String },
    resolutionNotes: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    estimatedRepairCost: { type: Number },
    actualRepairCost: { type: Number },

    // Problem categorization
    problemType: {
      type: String,
      enum: [
        "tires",
        "bodywork",
        "equipment",
        "hydraulics",
        "engine",
        "electrical",
        "other",
      ],
    },

    // Maintenance relationship
    maintenanceTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Maintenance",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Anomaly", AnomalySchema);
