import Project from "../models/masters/Project.modal.js";
import Site from "../models/masters/site.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

// ✅ Create Project
export const createProject = async (req, res) => {
  try {
    const { projectName, siteId, projectAddress } = req.body;

    if (
      !projectName ||
      typeof projectName !== "string" ||
      projectName.trim() === ""
    ) {
      return sendError(
        res,
        "projectName is required and must be a non-empty string",
        400
      );
    }

    if (
      !projectAddress ||
      typeof projectAddress !== "string" ||
      projectAddress.trim() === ""
    ) {
      return sendError(
        res,
        "projectAddress is required and must be a non-empty string",
        400
      );
    }

    if (!siteId || !siteId.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, "Valid siteId is required", 400);
    }

    const site = await Site.findById(siteId);
    if (!site) return sendError(res, "Site not found", 404);

    const existingProject = await Project.findOne({
      projectName: projectName.trim(),
      siteId,
    });
    if (existingProject) {
      return sendError(
        res,
        "Project with this name already exists for this site",
        400
      );
    }

    const project = await Project.create(req.body);
    return sendSuccess(res, "Project created successfully", project, 201);
  } catch (err) {
    console.error("Create Project Error:", err);
    return sendError(res, "Failed to create project", 500, err.message);
  }
};

// ✅ Get All Projects (with search, date filter, pagination)
export const getAllProjects = async (req, res) => {
  try {
    const {
      search,
      fromDate,
      toDate,
      siteId,
      isPagination = "true",
      page = 1,
      limit = 10,
    } = req.query;

    const match = {};

    if (siteId && siteId.match(/^[0-9a-fA-F]{24}$/)) {
      match.siteId = siteId;
    }

    // 🔎 Search filter (by projectName or projectAddress)
    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      match.$or = [
        { projectName: { $regex: regex } },
        { projectAddress: { $regex: regex } },
      ];
    }

    // 📅 Date filter
    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) match.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const nextDay = new Date(toDate);
        nextDay.setDate(nextDay.getDate() + 1);
        match.createdAt.$lt = nextDay;
      }
    }

    const query = Project.find(match)
      .populate("siteId")
      .sort({ createdAt: -1 });

    const total = await Project.countDocuments(match);

    if (isPagination === "true") {
      query.skip((page - 1) * limit).limit(parseInt(limit));
    }

    const projects = await query;

    return sendSuccess(
      res,
      "Projects fetched successfully",
      {
        projects,
        totalProjects: total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
      200
    );
  } catch (err) {
    return sendError(res, "Failed to fetch projects", 500, err.message);
  }
};

// ✅ Update Project
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

// ✅ Delete Project
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return sendError(res, "Project not found", 404);

    return sendSuccess(res, "Project deleted successfully", null, 200);
  } catch (err) {
    return sendError(res, "Failed to delete project", 400, err.message);
  }
};
