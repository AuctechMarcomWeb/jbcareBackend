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
// ✅ Get All Projects (with search, date filter, pagination, and sort order)
export const getAllProjects = async (req, res) => {
  try {
    const {
      search,
      fromDate,
      toDate,
      siteId,
      order = "desc", // 🔹 default: latest first
      isPagination = "true",
      page = 1,
      limit = 10,
    } = req.query;

    const match = {};

    // 🧩 Validate siteId before adding
    if (siteId && siteId.match(/^[0-9a-fA-F]{24}$/)) {
      match.siteId = siteId;
    }

    // 🔍 Search filter (ignore null/undefined)
    const searchTerm =
      typeof search === "string" &&
      search.trim() !== "" &&
      search.trim().toLowerCase() !== "null" &&
      search.trim().toLowerCase() !== "undefined"
        ? search.trim()
        : null;

    if (searchTerm) {
      const regex = new RegExp(searchTerm, "i");
      match.$or = [
        { projectName: { $regex: regex } },
        { projectAddress: { $regex: regex } },
      ];
    }

    // 📅 Date range filter
    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) match.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        match.createdAt.$lte = endOfDay;
      }
    }

    // 🔄 Sort order
    const sortOrder = order === "asc" ? 1 : -1;

    // 🏗️ Query with sort
    let query = Project.find(match)
      .populate("siteId")
      .sort({ createdAt: sortOrder });

    const total = await Project.countDocuments(match);

    // 📄 Pagination (optional)
    if (isPagination === "true") {
      query = query
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));
    }

    const projects = await query;

    return sendSuccess(
      res,
      projects.length ? "Projects fetched successfully" : "No projects found.",
      {
        projects,
        totalProjects: total,
        totalPages:
          isPagination === "true"
            ? Math.ceil(total / Number(limit))
            : total > 0
            ? 1
            : 0,
        currentPage: Number(page),
      },
      200
    );
  } catch (err) {
    console.error("Get Projects Error:", err);
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
