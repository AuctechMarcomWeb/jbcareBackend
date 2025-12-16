import mongoose from "mongoose";

const StockInSchema = new mongoose.Schema(
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
        lowStockLimit: { type: Number, default: 10 },

        siteId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Site",
            required: true,
        },

        quantity: { type: Number, default: 0 },

        // ⭐ NEW FIELD
        newStockReceivedDate: { type: Date },

        receivedBy: { type: String, trim: true },


        isDefective: { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false },

        // ⭐ STATUS FIELD
        status: {
            type: String,
            enum: ["IN STOCK", "LOW STOCK", "OUT OF STOCK"],
            default: "IN STOCK",
        },
    },
    { timestamps: true }
);

// Index for fast search
StockInSchema.index({ productName: 1 });

// ⭐ AUTO UPDATE status BEFORE SAVE
StockInSchema.pre("save", function (next) {
    if (this.quantity === 0) {
        this.status = "OUT OF STOCK";
    } else if (this.quantity < this.threshold && this.quantity !== 0) {
        this.status = "LOW STOCK";
    } else {
        this.status = "IN STOCK";
    }
    next();
});

const StockIn = mongoose.model("StockIn", StockInSchema);
export default StockIn;
