const mongoose = require("mongoose");

const MaintenanceSchema = new mongoose.Schema(
  {
    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
    },
    type: {
      type: String,
      enum: ["repair", "maintenance", "preventive"],
      required: true,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed", "awaiting_parts"],
      default: "in_progress",
    },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    description: { type: String },
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: "Workshop" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Maintenance", MaintenanceSchema);
