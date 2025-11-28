import mongoose from "mongoose";

const landlordSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    fatherOrSpouseName: { type: String, trim: true },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    dob: { type: Date },
    phone: { type: String, required: true },
    alternateMobileNumber: { type: String },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String },
    coorespondenceAddress: { type: String },
    profilePic: { type: String },
    idProof: {
      type: {
        type: String,
        enum: ["Aadhaar", "PAN", "Passport", "Driving License", "Other"],
      },
      number: { type: String, trim: true },
      documentUrl: { type: String }, // optional image/pdf link
    },
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
    unitIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Unit",
      },
    ],
    propertyDetails: {
      propertyName: { type: String },
      propertyType: {
        type: String,
        enum: ["Apartment", "House", "Shop", "Office", "Other"],
      },
      propertyAddress: { type: String },
      propertyDocumentsUrl: [{ type: String }], // array for multiple uploads
    }, // additional property details
    // ownership status
    isActive: { type: Boolean, default: true }, // false = archived
    ownershipStartDate: { type: Date, default: Date.now },
    ownershipEndDate: { type: Date },
    bankDetails: {
      accountHolderName: { type: String },
      bankName: { type: String },
      accountNumber: { type: String },
      ifscCode: { type: String },
      branchAddress: { type: String },
    },

    // 📞 Emergency & Misc Details
    emergencyContactName: { type: String },
    emergencyContactNumber: { type: String },
    notes: { type: String },
    walletBalance: { type: Number, default: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // whoever registered this landlord
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // 👈 new field
    parking: { type: String },
    availableBalance: { type: Number, default: 0 },
    // 🆕 NEW ELECTRIC METER FIELDS
    meterId: { type: String, trim: true }, // meter ID
    customerId: { type: String, trim: true }, // e.g. 5F-501
    meterSerialNumber: { type: String, trim: true }, // serial number printed on meter
    // 🆕 Opening Balance with debit/credit type
    openingBalance: {
      amount: { type: Number, default: 0 }, // Opening balance
      type: {
        type: String,
        enum: ["Debit", "Credit", null], // Debit = pending, Credit = advance
        default: null,
      },
    },
  },
  { timestamps: true }
);

const Landlord =
  mongoose.models.Landlord || mongoose.model("Landlord", landlordSchema);
export default Landlord;
