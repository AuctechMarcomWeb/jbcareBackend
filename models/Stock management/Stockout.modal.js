import mongoose from "mongoose";

const StockOutSchema = new mongoose.Schema(
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
        subCategoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SubCategory",
            required: true,
        },
        siteId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Site",
            required: true,
        },
        unitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Unit",
            required: true,
        },
        supervisor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Supervisor",
            required: true,
        },

        productName: { type: String, required: true, trim: true },
        productLocation: { type: String, trim: true },
        unit: { type: String, default: "Nos" },
        remark: { type: String, },


        quantity: { type: Number, default: 0 },


        date: { type: Date },



    },
    { timestamps: true }
);


StockOutSchema.index({ productName: 1 });



const StockOut = mongoose.model("StockOut", StockOutSchema);
export default StockOut;
