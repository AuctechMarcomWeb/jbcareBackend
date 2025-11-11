import Site from "../models/masters/site.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

export const createSite = async (req, res) => {
  try {
    const { siteName, siteAddress, city, state, country } = req.body;

    if (!siteName || typeof siteName !== "string" || siteName.trim() === "") {
      return sendError(
        res,
        "siteName is required and must be a non-empty string",
        400
      );
    }

    if (
      !siteAddress ||
      typeof siteAddress !== "string" ||
      siteAddress.trim() === ""
    ) {
      return sendError(
        res,
        "siteAddress is required and must be a non-empty string",
        400
      );
    }

    const existingSite = await Site.findOne({
      siteName: siteName.trim(),
    });

    if (existingSite) {
      return sendError(res, "Site with this name  already exists", 400);
    }

    const site = await Site.create(req.body);

    return sendSuccess(res, "Site created successfully", site, 201);
  } catch (err) {
    console.error("Create Site Error:", err);
    return sendError(res, "Failed to create site", 500, err.message);
  }
};

// ✅ Get All Sites (with search, pagination, date range, sort order, and status filter)
export const getAllSites = async (req, res) => {
  try {
    const {
      search,
      fromDate,
      toDate,
      order = "desc", // default: latest first
      isPagination = "true",
      page = 1,
      limit = 10,
      status, // ✅ NEW: Accept status filter (true/false)
    } = req.query;

    const match = {};

    // --- ✅ Status filter (true/false as string)
    if (status === "true") {
      match.status = true;
    } else if (status === "false") {
      match.status = false;
    }

    // --- Normalize pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);

    // --- Search filter
    const searchTerm =
      typeof search === "string" &&
      search.trim() !== "" &&
      search.trim().toLowerCase() !== "null" &&
      search.trim().toLowerCase() !== "undefined"
        ? search.trim()
        : null;

    if (searchTerm) {
      match.$or = [
        { siteName: { $regex: searchTerm, $options: "i" } },
        { siteAddress: { $regex: searchTerm, $options: "i" } },
      ];
    }

    // --- Date range filter
    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) match.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        match.createdAt.$lte = endOfDay;
      }
    }

    // --- Sort order
    const sortOrder = order === "asc" ? 1 : -1;

    // --- Build query
    let query = Site.find(match).sort({ createdAt: sortOrder });

    const total = await Site.countDocuments(match);

    // --- Apply pagination if enabled
    if (isPagination === "true") {
      query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const sites = await query;

    return sendSuccess(
      res,
      sites.length ? "Sites fetched successfully" : "No sites found.",
      {
        sites,
        totalSites: total,
        totalPages:
          isPagination === "true"
            ? Math.ceil(total / limitNum)
            : total > 0
            ? 1
            : 0,
        currentPage: pageNum,
      },
      200
    );
  } catch (err) {
    console.error("Get Sites Error:", err);
    return sendError(res, "Failed to fetch sites", 500, err.message);
  }
};

export const updateSite = async (req, res) => {
  try {
    const site = await Site.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!site) return sendError(res, "Site not found", 404);

    return sendSuccess(res, "Site updated successfully", site, 200);
  } catch (err) {
    return sendError(res, "Failed to update site", 400, err.message);
  }
};

export const deleteSite = async (req, res) => {
  try {
    const site = await Site.findByIdAndDelete(req.params.id);
    if (!site) return sendError(res, "Site not found", 404);

    return sendSuccess(res, "Site deleted successfully", null, 200);
  } catch (err) {
    return sendError(res, "Failed to delete site", 400, err.message);
  }
};
