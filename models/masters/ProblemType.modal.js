import mongoose from "mongoose";

const problemTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    isDeleted: {
      type: Boolean,
      default: false, // Soft delete
    },
  },
  { timestamps: true }
);

export default mongoose.model("ProblemType", problemTypeSchema);
