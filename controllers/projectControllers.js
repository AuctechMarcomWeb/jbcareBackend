import Project from "../models/masters/Project.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

export const createProject = async (req, res) => {
  try {
    const project = await Project.create(req.body);
    return sendSuccess(res, "Project created successfully", project, 201);
  } catch (err) {
    return sendError(res, "Failed to create project", 400, err.message);
  }
};

// Get all projects (with populated site details)
export const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find().populate(
      "siteId",
      "siteName siteAddress"
    );
    return sendSuccess(res, "Projects fetched successfully", projects, 200);
  } catch (err) {
    return sendError(res, "Failed to fetch projects", 500, err.message);
  }
};

// Update a project by ID
export const updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!project) return sendError(res, "Project not found", 404);

    return sendSuccess(res, "Project updated successfully", project, 200);
  } catch (err) {
    return sendError(res, "Failed to update project", 400, err.message);
  }
};

// Delete a project by ID
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return sendError(res, "Project not found", 404);

    return sendSuccess(res, "Project deleted successfully", null, 200);
  } catch (err) {
    return sendError(res, "Failed to delete project", 400, err.message);
  }
};
