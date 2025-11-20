import mongoose from "mongoose";

const WarehouseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String },
    address: String,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Warehouse = mongoose.model("Warehouse", WarehouseSchema);
export default Warehouse;
