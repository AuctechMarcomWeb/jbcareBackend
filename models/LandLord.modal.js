import mongoose from "mongoose";

const landlordSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String },
    profilePic: { type: String },
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
    unitIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Unit",
      },
    ],

    // ownership status
    isActive: { type: Boolean, default: true }, // false = archived
    ownershipStartDate: { type: Date, default: Date.now },
    ownershipEndDate: { type: Date },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // whoever registered this landlord
    },
  },
  { timestamps: true }
);

const Landlord =
  mongoose.models.Landlord || mongoose.model("Landlord", landlordSchema);
export default Landlord;
