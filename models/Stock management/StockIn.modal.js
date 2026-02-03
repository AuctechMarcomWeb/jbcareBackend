import mongoose from "mongoose";

const StockInSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    // subCategoryId: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "SubCategory",
    //     required: true,
    // },
    brandName: String,
    productName: { type: String, required: true, trim: true },
    productLocation: { type: String, trim: true },
    unit: { type: String, default: "Nos" },
    lowStockLimit: { type: Number, default: 10 },

    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },

    quantity: { type: Number, default: 0 },

    // ⭐ NEW FIELD
    newStockReceivedDate: { type: Date },
    lastUpdatedDate: { type: Date },
    stockOutQuantity: {
      type: Number,
      default: 0,
    },
    lastStockOut: { type: Date },
    receivedBy: { type: String, trim: true },

    isDefective: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },

    // ⭐ STATUS FIELD
    status: {
      type: String,
      enum: ["IN STOCK", "LOW STOCK", "OUT OF STOCK"],
      default: "IN STOCK",
    },
    stockout: [
      {
        complainId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Complaint",
          required: true,
        },
        categoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category",
          required: true,
        },
        brandName: String,
        siteId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Site",
          required: true,
        },
        supervisor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Supervisor",
          required: true,
        },

        productName: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "StockIn",
          required: true,
        },
        productLocation: { type: String, trim: true },
        unit: { type: String, default: "Nos" },
        remark: { type: String },

        quantity: { type: Number, default: 0 },

        date: { type: Date },
      },
    ],
    // 🔹 STOCK-IN HISTORY
    stockin: [
      {
        quantity: { type: Number, required: true },
        receivedBy: { type: String, trim: true },
        brandName: String,
        receivedDate: { type: Date, default: Date.now },
        isDefective: { type: Boolean, default: false },
        remark: { type: String, trim: true },
      },
    ],
  },
  { timestamps: true },
);

// Index for fast search
StockInSchema.index({ productName: 1 });
StockInSchema.index({ newStockReceivedDate: 1 });
StockInSchema.index({ lastUpdatedDate: 1 });
StockInSchema.index(
  {
    categoryId: 1,
    siteId: 1,
    productName: 1,
  },
  { unique: true },
);
StockInSchema.pre("save", function (next) {
  if (this.quantity <= 0) {
    this.status = "OUT OF STOCK";
  } else if (this.quantity <= this.lowStockLimit) {
    this.status = "LOW STOCK";
  } else {
    this.status = "IN STOCK";
  }

  this.lastUpdatedDate = new Date();
  next();
});
StockInSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();

  // Get updated values or fallback to existing document
  const doc = await this.model.findOne(this.getQuery());

  const quantity = update.quantity ?? update.$set?.quantity ?? doc.quantity;

  const lowStockLimit =
    update.lowStockLimit ?? update.$set?.lowStockLimit ?? doc.lowStockLimit;

  let status = "IN STOCK";

  if (quantity <= 0) {
    status = "OUT OF STOCK";
  } else if (quantity <= lowStockLimit) {
    status = "LOW STOCK";
  }

  // Force update status + lastUpdatedDate
  this.set({
    status,
    lastUpdatedDate: new Date(),
  });

  next();
});

const StockIn = mongoose.model("StockIn", StockInSchema);
export default StockIn;
