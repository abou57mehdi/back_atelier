const mongoose = require("mongoose");

const WorkshopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    assignedManager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedEquipment: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Equipment" },
    ],
    teams: [
      {
        type: String,
        enum: [
          "mechanic",
          "workshop_supervisor",
          "tire_specialist",
          "refrigeration",
        ],
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Workshop", WorkshopSchema);
