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

    complaintTitle: {
      type: String,
      required: true,
    },
    complaintDescription: {
      type: String,
      required: true,
    },
    images: [{ type: String }],

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

const Complaint =
  mongoose.models.Complaint || mongoose.model("Complaint", complaintSchema);
export default Complaint;
