const mongoose = require("mongoose");

const EquipmentSchema = new mongoose.Schema(
  {
    billunId: { type: String, required: true, unique: true }, // BLN-2024-XXXXXX
    internalId: { type: String }, // Total flexibility
    licensePlate: { type: String },
    name: { type: String },

    // Equipment type
    equipmentType: {
      type: String,
      enum: ["vehicle", "trailer", "handling"],
      required: true,
    },

    // Vehicle types
    vehicleType: {
      type: String,
      enum: ["truck", "truck_trailer", "road_tractor", "van", "car", "custom"],
    },

    // Trailer types
    trailerType: {
      type: String,
      enum: [
        "tarpaulin",
        "refrigerated",
        "box",
        "tanker",
        "tipper",
        "moving_floor",
        "flatbed",
        "container_chassis",
        "train",
        "custom",
      ],
    },

    // Handling types
    handlingType: {
      type: String,
      enum: ["pallet_truck", "electric_pallet_truck", "forklift", "custom"],
    },

    // Brand and model
    brand: { type: String },
    model: { type: String },
    yearOfService: { type: Number },

    // Fuel and environment
    fuelType: {
      type: String,
      enum: [
        "diesel",
        "gasoline",
        "lpg",
        "cng",
        "lng",
        "electric",
        "hybrid",
        "hydrogen",
        "biofuel",
        "e85",
        "adblue",
        "other",
      ],
    },
    customFuelType: { type: String }, // For specialized fuels

    // Technical data
    currentMileage: { type: Number },
    emptyWeight: { type: Number },
    nextTechnicalInspection: { type: Date },
    nextMaintenance: { type: Date },

    // Dimensions
    dimensions: {
      length: { type: Number }, // meters
      width: { type: Number }, // meters
      height: { type: Number }, // meters
      usefulVolume: { type: Number }, // m³
    },

    // ADR and safety equipment
    adrPlate: { type: Boolean, default: false },
    adrKit: { type: Boolean, default: false },
    tailgateLift: { type: Boolean, default: false },
    nextTailgateMaintenance: { type: Date },
    tailgateSafetyCable: { type: Boolean, default: false },
    slidingDoor: { type: Boolean, default: false },

    // Organization
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site" },
    workshop: { type: mongoose.Schema.Types.ObjectId, ref: "Workshop" },
    assignedManager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedTeam: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    status: {
      type: String,
      enum: ["available", "maintenance", "unavailable"],
      default: "available",
    },

    // Custom fields
    customFields: { type: Map, of: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Equipment", EquipmentSchema);
