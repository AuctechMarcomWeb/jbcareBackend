import mongoose from "mongoose";

const maintainChargesSchema = new mongoose.Schema(
  {
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },
    rateType: {
      type: String,
      enum: ["per_sqft", "fixed"],
      default: "per_sqft",
    },
    rateValue: { type: Number, required: true },
    gstPercent: { type: Number, default: 0 },
    effectiveFrom: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

maintainChargesSchema.index({ siteId: 1, unitId: 1, isActive: 1 });

const MaintainCharges =
  mongoose.models.MaintainCharges ||
  mongoose.model("MaintainCharges", maintainChargesSchema);
export default MaintainCharges;
