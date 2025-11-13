import mongoose from "mongoose";

const fixedChargesSchema = new mongoose.Schema(
  {
    rateType: {
      type: String,
      enum: ["per_sqft", "fixed"],
      default: "fixed",
    },
    rateValue: { type: Number, required: true },
    gstPercent: { type: Number, default: 0 },
    description: { type: String, default: "" },
    overwriteExisting: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const FixedCharges =
  mongoose.models.FixedCharges ||
  mongoose.model("FixedCharges", fixedChargesSchema);

export default FixedCharges;
