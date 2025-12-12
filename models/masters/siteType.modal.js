// models/SiteType.js
import mongoose from "mongoose";

const SiteTypeSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, unique: true },
        status: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const SiteType = mongoose.model("SiteType", SiteTypeSchema);
export default SiteType;