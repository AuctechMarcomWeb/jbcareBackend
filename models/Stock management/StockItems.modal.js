import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true,
    },

    productName: { type: String, required: true, trim: true },
    productLocation: { type: String, trim: true },

    unit: { type: String, default: "Nos" },
    threshold: { type: Number, default: 10 },

    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },

    quantity: { type: Number, default: 0 },

    // ⭐ SOFT DELETE
    isDeleted: { type: Boolean, default: false },

    // ⭐ STATUS FIELD
    status: {
      type: String,
      enum: ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"],
      default: "IN_STOCK",
    },
  },
  { timestamps: true }
);

// Index for fast search
ItemSchema.index({ productName: 1 });

// ⭐ AUTO UPDATE status BEFORE SAVE
ItemSchema.pre("save", function (next) {
  if (this.quantity === 0) {
    this.status = "OUT_OF_STOCK";
  } else if (this.quantity < this.threshold) {
    this.status = "LOW_STOCK";
  } else {
    this.status = "IN_STOCK";
  }
  next();
});

const StockItems = mongoose.model("StockItems", ItemSchema);
module.exports = StockItems;
