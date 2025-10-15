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
      required: true,
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
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Unit = mongoose.model("Unit", unitSchema);
export default Unit;
