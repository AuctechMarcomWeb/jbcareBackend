import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Who created the complaint
    addedBy: {
      type: String,
      enum: ["Landlord", "Tenant", "Admin"],
    },

    complaintTitle: {
      type: String,
      required: true,
    },
    complaintDescription: {
      type: String,
      required: true,
    },
    images: [{ type: String }],

    // Current status
    status: {
      type: String,
      enum: [
        "Pending",
        "Under Review",
        "Material Demand Raised",
        "Resolved",
        "Repushed",
        "Closed",
      ],
      default: "Pending",
    },

    /**
     * 🧾 Complete history of status updates
     * - Tracks who made the update
     * - Tracks their role (Admin, Supervisor, Landlord, Tenant)
     * - Stores optional comment
     */
    statusHistory: [
      {
        status: { type: String },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        updatedByRole: {
          type: String,
          enum: ["Admin", "Supervisor", "Landlord", "Tenant"],
        },
        comment: { type: String },
        updatedAt: { type: Date, default: Date.now },
      },
    ],

    // Supervisor fields
    supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    supervisorComments: { type: String },
    supervisorImages: [{ type: String }],

    // Material demand
    materialDemand: {
      materialName: String,
      quantity: String,
      reason: String,
    },
    materialDemandRaisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    materialDemandRaisedAt: Date,

    // Resolution fields
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedImages: [{ type: String }],
    resolvedAt: Date,

    // Customer verification
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    closedAt: Date,
    repushedCount: { type: Number, default: 0 },
    repushedAt: Date,

    verifiedAt: Date,
  },
  { timestamps: true }
);

/**
 * 🧠 Middleware to log status changes automatically
 * (Controller should set: `complaint.updatedBy`, `complaint.updatedByRole`, and optional `complaint.comment`)
 */
complaintSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.statusHistory.push({
      status: this.status,
      updatedBy: this.updatedBy || null,
      updatedByRole: this.updatedByRole || null,
      comment: this.comment || null,
      updatedAt: new Date(),
    });
  }
  next();
});

const Complaint =
  mongoose.models.Complaint || mongoose.model("Complaint", complaintSchema);
export default Complaint;
