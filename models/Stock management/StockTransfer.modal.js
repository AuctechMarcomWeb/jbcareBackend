import mongoose from "mongoose";

const StockTransferSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockItems",
      required: true,
    },

    fromWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },

    toWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
    },

    transferredBy: {
      type: String,
      required: true,
    },

    remarks: { type: String },
  },
  { timestamps: true }
);

const StockTransfer = mongoose.model("StockTransfer", StockTransferSchema);
export default StockTransfer;
