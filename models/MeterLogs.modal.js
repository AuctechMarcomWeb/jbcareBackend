import mongoose from "mongoose";

const meterLogSchema = new mongoose.Schema(
  {
    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Landlord",
      required: true,
    },

    customerId: {
      type: String,
      required: true,
      trim: true,
    },

    meterId: {
      type: String,
      trim: true,
    },

    meterSerialNumber: {
      type: String,
      trim: true,
    },

    currentStatus: {
      type: String,
      enum: ["ON", "OFF"],
      required: true,
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    responseFromElectricityAPI: {
      type: Object,
      default: {},
    },
    logs: [
      {
        action: { type: String, enum: ["ON", "OFF"], required: true },
        timestamp: { type: Date, default: Date.now },
        response: { type: Object },
        requestedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.MeterLog ||
  mongoose.model("MeterLog", meterLogSchema);

