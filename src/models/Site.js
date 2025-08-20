const mongoose = require("mongoose");

const SiteSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String },
    assignedManager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedEquipment: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Equipment" },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Site", SiteSchema);
