import mongoose from "mongoose";

const FixElectricityChargesSchema = new mongoose.Schema(
    {
        siteTypeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SiteType",
            required: true,
        },
        fixLoadcharges: { type: Number, required: true },
        fixmantance: { type: Number, required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const FixElectricityCharges =
    mongoose.models.FixElectricityCharges ||
    mongoose.model("FixElectricityCharges", FixElectricityChargesSchema);
export default FixElectricityCharges;
