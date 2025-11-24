import mongoose from "mongoose";

const SupervisorStockSchema = new mongoose.Schema(
  {
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supervisor",
      required: true,
    },

    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockItems",
      required: true,
    },

    quantity: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// 🚀 Prevent duplicate records
SupervisorStockSchema.index({ supervisorId: 1, itemId: 1 }, { unique: true });

export default mongoose.model("SupervisorStock", SupervisorStockSchema);
