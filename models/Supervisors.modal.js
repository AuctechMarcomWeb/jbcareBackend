import mongoose from "mongoose";

const verificationDocSchema = new mongoose.Schema({
  type: { type: String, enum: ["Aadhar", "PAN", "Other"], required: true },
  number: { type: String, required: true },
  fileUrl: { type: String }, // optional, if file is uploaded
});

const supervisorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    verificationDocuments: [verificationDocSchema],
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
    //   required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    //   required: true,
    },
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: "Unit" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
supervisorSchema.index({ email: 1 });
supervisorSchema.index({ siteId: 1 });
supervisorSchema.index({ projectId: 1 });
supervisorSchema.index({ unitId: 1 });
const Supervisor = mongoose.model("Supervisor", supervisorSchema);
export default Supervisor;
