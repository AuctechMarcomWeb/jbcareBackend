import mongoose from "mongoose";

const ProcurementRequestSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockItems",
      required: true,
    },

    requestedQty: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: ["PENDING", "ORDERED", "RECEIVED"],
      default: "PENDING",
    },

    demandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockDemand",
      default: null, // auto-linked
    },

    notes: { type: String },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    warehouseId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Warehouse"
    }
  },
  { timestamps: true }
);

export default mongoose.model("ProcurementRequest", ProcurementRequestSchema);
