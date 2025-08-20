const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, sparse: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    role: {
      type: String,
      enum: ["admin", "manager", "driver", "workshop"],
      required: true,
    },
    password: { type: String, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    lastLogin: { type: Date },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    isTemporary: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
