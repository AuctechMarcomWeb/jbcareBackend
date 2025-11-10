import mongoose from "mongoose";

const cronLogSchema = new mongoose.Schema(
  {
    jobName: { type: String, required: true }, // e.g., "Monthly Maintenance Bill"
    status: { type: String, enum: ["success", "failed"], default: "success" },
    totalProcessed: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    details: [
      {
        landlordId: { type: mongoose.Schema.Types.ObjectId, ref: "Landlord" },
        unitId: { type: mongoose.Schema.Types.ObjectId, ref: "Unit" },
        siteId: { type: mongoose.Schema.Types.ObjectId, ref: "Site" },
        status: { type: String, enum: ["success", "failed"] },
        message: String,
      },
    ],
    runAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("CronLog", cronLogSchema);
