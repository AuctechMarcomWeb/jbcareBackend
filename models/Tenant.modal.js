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
      // required: true,
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

    // ✅ NEW FIELDS
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Male",
    },
    dob: { type: Date },

    idProof: {
      type: {
        type: String,
        enum: ["Aadhaar", "PAN", "Passport", "Driving License", "Other"],
      },
      number: { type: String, trim: true },
      documentUrl: { type: String }, // optional image/pdf link
    },

    isActive: { type: Boolean, default: true },
    tenancyStartDate: { type: Date, default: Date.now },
    tenancyEndDate: { type: Date },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Tenant = mongoose.models.Tenant || mongoose.model("Tenant", tenantSchema);
export default Tenant;
