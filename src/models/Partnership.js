const mongoose = require("mongoose");

const PartnershipSchema = new mongoose.Schema(
  {
    // Partnership companies
    initiator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    // Partnership details
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "suspended"],
      default: "pending",
    },

    // Invitation details
    invitationMessage: { type: String },
    contactPerson: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String },
    },

    // Equipment access control
    equipmentAccess: {
      allowReporting: { type: Boolean, default: true },
      allowViewing: { type: Boolean, default: true },
      restrictedEquipmentIds: [
        { type: mongoose.Schema.Types.ObjectId, ref: "Equipment" },
      ],
    },

    // Partnership metrics
    metrics: {
      reportsReceived: { type: Number, default: 0 },
      reportsProvided: { type: Number, default: 0 },
      lastActivity: { type: Date, default: Date.now },
    },

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date },
    suspendedAt: { type: Date },

    // Additional notes
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate partnerships
PartnershipSchema.index({ initiator: 1, partner: 1 }, { unique: true });

// Static method to create bidirectional partnership
PartnershipSchema.statics.createBidirectional = async function (
  initiatorId,
  partnerId,
  invitationData
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create partnership from initiator to partner
    const partnership1 = new this({
      initiator: initiatorId,
      partner: partnerId,
      ...invitationData,
    });

    // Create partnership from partner to initiator (auto-accepted)
    const partnership2 = new this({
      initiator: partnerId,
      partner: initiatorId,
      status: "pending", // Will be accepted when partner accepts invitation
      invitationMessage: `Partnership invitation from ${
        invitationData.contactPerson?.name || "Unknown"
      }`,
      contactPerson: invitationData.contactPerson,
      equipmentAccess: invitationData.equipmentAccess,
    });

    await partnership1.save({ session });
    await partnership2.save({ session });

    await session.commitTransaction();

    return { partnership1, partnership2 };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Method to accept partnership (updates both directions)
PartnershipSchema.methods.accept = async function () {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Update this partnership
    this.status = "accepted";
    this.acceptedAt = new Date();
    await this.save({ session });

    // Find and update the reverse partnership
    const reversePartnership = await this.constructor
      .findOne({
        initiator: this.partner,
        partner: this.initiator,
      })
      .session(session);

    if (reversePartnership) {
      reversePartnership.status = "accepted";
      reversePartnership.acceptedAt = new Date();
      await reversePartnership.save({ session });
    }

    await session.commitTransaction();
    return this;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Method to decline partnership (updates both directions)
PartnershipSchema.methods.decline = async function () {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Update this partnership
    this.status = "declined";
    await this.save({ session });

    // Find and update the reverse partnership
    const reversePartnership = await this.constructor
      .findOne({
        initiator: this.partner,
        partner: this.initiator,
      })
      .session(session);

    if (reversePartnership) {
      reversePartnership.status = "declined";
      await reversePartnership.save({ session });
    }

    await session.commitTransaction();
    return this;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = mongoose.model("Partnership", PartnershipSchema);
