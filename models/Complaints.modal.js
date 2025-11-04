import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * 🔹 Sub-schema for supervisor details
 */
const SupervisorDetailsSchema = new Schema(
  {
    supervisorId: { type: Schema.Types.ObjectId, ref: "Supervisor" },
    comments: { type: String, trim: true },
    images: [{ type: String }],
  },
  { _id: false }
);

/**
 * 🔹 Sub-schema for material demand
 */
const MaterialDemandSchema = new Schema(
  {
    materialName: { type: String, required: true, trim: true },
    quantity: { type: String, required: true, trim: true },
    reason: { type: String, trim: true },
    images: [{ type: String }],
  },
  { _id: false }
);

/**
 * 🔹 Sub-schema for resolution details
 */
const ResolutionSchema = new Schema(
  {
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    remarks: { type: String, trim: true },
    images: [{ type: String }],
    resolvedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/**
 * 🔹 Sub-schema for repush details
 */
const RepushedDetailsSchema = new Schema(
  {
    count: { type: Number, default: 1 },
    reason: { type: String, trim: true },
    repushedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/**
 * 🔹 Sub-schema for each status history entry
 */
const StatusHistorySchema = new Schema(
  {
    status: {
      type: String,
      enum: [
        "Pending",
        "Under Review",
        "Material Demand Raised",
        "Resolved",
        "Closed",
        "Repushed",
      ],
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedByRole: {
      type: String,
      enum: ["Admin", "Supervisor", "Landlord", "Tenant"],
    },
    comment: { type: String, trim: true },
    supervisorDetails: SupervisorDetailsSchema,
    materialDemand: MaterialDemandSchema,
    resolution: ResolutionSchema,
    closedBy: { type: Schema.Types.ObjectId, ref: "User" },
    closedImages: [{ type: String }],
    repushedDetails: RepushedDetailsSchema,
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

/**
 * 🔹 Main Complaint Schema
 */
const ComplaintSchema = new Schema(
  {
    siteId: { type: Schema.Types.ObjectId, ref: "Site", required: true },
    // projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    unitId: { type: Schema.Types.ObjectId, ref: "Unit", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    addedBy: {
      type: String,
      enum: ["Landlord", "Tenant", "Admin"],
      required: true,
    },
    complaintTitle: { type: String, required: true, trim: true },
    complaintDescription: { type: String, required: true, trim: true },
    images: [{ type: String }],

    // 🔹 Current status
    status: {
      type: String,
      enum: [
        "Pending",
        "Under Review",
        "Material Demand Raised",
        "Resolved",
        "Closed",
        "Repushed",
      ],
      default: "Pending",
    },

    // 🔹 Full status history
    statusHistory: [StatusHistorySchema],
  },
  { timestamps: true }
);

const Complaint =
  mongoose.models.Complaint || mongoose.model("Complaint", ComplaintSchema);

export default Complaint;
