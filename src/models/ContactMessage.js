const mongoose = require("mongoose");

const ContactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    company: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["new", "contacted", "in_progress", "converted", "rejected"],
      default: "new",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    notes: {
      type: String,
      trim: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    source: {
      type: String,
      enum: ["website", "email", "phone", "referral", "other"],
      default: "website",
    },
    responseDate: {
      type: Date,
    },
    conversionDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for response time calculation
ContactMessageSchema.virtual("responseTime").get(function () {
  if (this.responseDate && this.createdAt) {
    return Math.round(
      (this.responseDate - this.createdAt) / (1000 * 60 * 60 * 24)
    ); // days
  }
  return null;
});

// Index for efficient queries
ContactMessageSchema.index({ status: 1, createdAt: -1 });
ContactMessageSchema.index({ email: 1 });
ContactMessageSchema.index({ assignedTo: 1 });

module.exports = mongoose.model("ContactMessage", ContactMessageSchema);
