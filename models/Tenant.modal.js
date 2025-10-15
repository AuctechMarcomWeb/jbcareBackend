import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    address: { type: String },
    profilePic: { type: String }, // image URL

    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },
    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Landlord",
      required: true,
    },

    addedBy: {
      type: String,
      enum: ["admin", "landlord"],
      required: true,
    },

    billTo: {
      type: String,
      enum: ["tenant", "landlord"],
      default: "tenant",
    },

    isActive: { type: Boolean, default: true },
    tenancyStartDate: { type: Date, default: Date.now },
    tenancyEndDate: { type: Date },
  },
  { timestamps: true }
);

const Tenant = mongoose.model("Tenant", tenantSchema);
export default Tenant;
