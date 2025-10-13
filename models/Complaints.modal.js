import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    complaintTitle: {
      type: String,
      required: true,
    },
    complaintDescription: {
      type: String,
      required: true,
    },
    images: [
      {
        type: String, // URLs for uploaded images (e.g., Cloudinary or S3)
      },
    ],

    status: {
      type: String,
      enum: ["Pending", "Under Review", "Resolved", "Rejected"],
      default: "Pending",
    },

    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    supervisorComments: {
      type: String,
    },

    supervisorImages: [
      {
        type: String, // photo uploaded when reviewing complaint
      },
    ],

    resolvedImages: [
      {
        type: String, // photo uploaded when resolved
      },
    ],

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    resolvedAt: {
      type: Date,
    },

    verifiedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const Complaint = mongoose.model("Complaint", complaintSchema);
export default Complaint;
