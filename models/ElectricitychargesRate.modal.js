import mongoose from "mongoose";

const electricityChargesSchema = new mongoose.Schema(
    {
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
        
        tariffGrid: { type: Number, required: true },
        dgTariff: { type: Number, required: true },
        surchargePercent: { type: Number, default: 0 },
        effectiveFrom: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

electricityChargesSchema.index({ siteId: 1, unitId: 1, isActive: 1 });

const electricityCharges =
    mongoose.models.electricityCharges ||
    mongoose.model("electricityCharges", electricityChargesSchema);
export default electricityCharges;
