// models/UnitType.js
import mongoose from "mongoose";

const unitTypeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, unique: true },
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const UnitType = mongoose.model("UnitType", unitTypeSchema);
export default UnitType;