const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    siret: { type: String },
    mainManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "pending_partnership"],
      default: "active",
    },
    sites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Site" }],
    workshops: [{ type: mongoose.Schema.Types.ObjectId, ref: "Workshop" }],
    equipment: [{ type: mongoose.Schema.Types.ObjectId, ref: "Equipment" }],
    partnerships: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Partnership" },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", CompanySchema);
