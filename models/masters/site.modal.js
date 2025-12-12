// models/Site.js
import mongoose from "mongoose";

const siteSchema = new mongoose.Schema(
  {
    siteName: { type: String, required: true, unique: true },
    siteType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SiteType",
      required: true,
    },
    siteAddress: { type: String, required: true },
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Site = mongoose.model("Site", siteSchema);
export default Site;