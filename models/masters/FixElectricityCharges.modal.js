import mongoose from "mongoose";

const FixElectricityChargesSchema = new mongoose.Schema(
    {
        siteType: {
            type: String,
            required: true,
        },
        fixLoadcharges: { type: Number, required: true },
        fixmantance: { type: Number, required: true },
        surchargePercent: { type: Number, required: true },
        tariffRate: { type: Number, required: true },
        dgTariff: { type: Number, required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const FixElectricityCharges =
    mongoose.models.FixElectricityCharges ||
    mongoose.model("FixElectricityCharges", FixElectricityChargesSchema);
export default FixElectricityCharges;
