// models/Unit.js
import mongoose from "mongoose";

const unitSchema = new mongoose.Schema(
  {
    unitNumber: { type: String, required: true, unique: true },
    block: { type: String },
    floor: { type: String },
    areaSqFt: { type: Number },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      // required: true,
    },
    unitTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UnitType",
      required: true,
    },
    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Landlord",
    },
     tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
    },
    landlordHistory: [
      {
        landlordId: { type: mongoose.Schema.Types.ObjectId, ref: "Landlord" },
        startDate: { type: Date, default: Date.now },
        endDate: { type: Date },
        isActive: { type: Boolean, default: true },
      },
    ],
    tenantHistory: [
      {
        tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
        startDate: { type: Date, required: true },
        endDate: { type: Date },
        addedBy: {
          type: String,
          enum: ["admin", "landlord"],
        },
        billTo: { type: String, enum: ["tenant", "landlord"] },
        isActive: { type: Boolean, default: true },
      },
    ],
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Unit = mongoose.model("Unit", unitSchema);
export default Unit;
