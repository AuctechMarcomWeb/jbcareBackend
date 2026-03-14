import mongoose from "mongoose";

const StockTransferSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockIn",
      required: true,
    },

    productName: String,
    brandName: String,
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },

    fromSiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },

    toSiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
    },

    remark: {
      type: String,
      trim: true,
    },

    transferDate: {
      type: Date,
      default: Date.now,
    },

    transferredBy: {
      type: String,
    },
  },
  { timestamps: true }
);

const StockTransfer = mongoose.model("StockTransfer", StockTransferSchema);

export default StockTransfer;