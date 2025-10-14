// models/Project.js
import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },
    projectAddress: { type: String, required: true },
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Project = mongoose.model("Project", projectSchema);
export default Project;
