const mongoose = require("mongoose");

const PhotoSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },

    // Storage information
    storageUrl: { type: String, required: true }, // Infomaniak or local URL
    thumbnailUrl: { type: String },
    localPath: { type: String }, // Temporary local path before upload

    // Metadata
    geolocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy: { type: Number },
      timestamp: { type: Date, default: Date.now },
    },

    // AI Enhancement
    aiEnhanced: { type: Boolean, default: false },
    originalPhotoId: { type: mongoose.Schema.Types.ObjectId, ref: "Photo" }, // Reference to original before enhancement
    enhancementType: {
      type: String,
      enum: ["night", "clarity", "contrast", "none"],
      default: "none",
    },

    // Context
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    relatedAnomalyId: { type: mongoose.Schema.Types.ObjectId, ref: "Anomaly" },
    relatedEquipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
    },

    // Photo Analysis
    tags: [{ type: String }], // AI-generated tags
    detectedIssues: [{ type: String }], // AI-detected problems
    qualityScore: { type: Number, min: 0, max: 100 }, // Photo quality rating

    // Metadata from mobile
    deviceInfo: {
      platform: { type: String },
      version: { type: String },
      model: { type: String },
    },

    // Status
    status: {
      type: String,
      enum: ["uploading", "processing", "ready", "failed"],
      default: "uploading",
    },
    processingError: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Photo", PhotoSchema);
