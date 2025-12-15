import Site from "../models/masters/site.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

export const createSite = async (req, res) => {
  try {
    const { siteName, siteAddress, siteType } = req.body;

    // Validation
    if (!siteName || siteName.trim() === "") {
      return sendError(res, "siteName is required", 400);
    }
    if (!siteAddress || siteAddress.trim() === "") {
      return sendError(res, "siteAddress is required", 400);
    }
    if (!siteType) {
      return sendError(res, "siteType is required", 400);
    }

    // Check duplicate
    const existingSite = await Site.findOne({
      siteName: { $regex: `^${siteName.trim()}$`, $options: "i" },
    });

    if (existingSite) {
      return sendError(res, "Site with this name already exists", 400);
    }

    // Create
    const site = await Site.create({
      siteName: siteName.trim(),
      siteAddress: siteAddress.trim(),
      siteType,
    });

    return sendSuccess(res, "Site created successfully", site, 201);
  } catch (err) {
    console.error("Create Site Error:", err);
    return sendError(res, "Failed to create site", 500, err.message);
  }
};

// ---------------------------------------------------------
// GET ALL SITES (Search + Pagination + Date Filter + Status Filter)
// ---------------------------------------------------------
export const getAllSites = async (req, res) => {
  try {
    const {
      search,
      fromDate,
      toDate,
      order = "desc",
      isPagination = "true",
      page = 1,
      siteType,
      limit = 10,
      status,
    } = req.query;

    const match = {};

    // Status filter
    if (status === "true") match.status = true;
    if (status === "false") match.status = false;

    if (siteType) {
      match.siteType = siteType; // ObjectId expected
    }

    // Search match
    if (search && search.trim() !== "") {
      const keyword = search.trim();
      match.$or = [
        { siteName: { $regex: keyword, $options: "i" } },
        { siteAddress: { $regex: keyword, $options: "i" } },
      ];
    }

    // Date filter
    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) match.createdAt.$gte = new Date(fromDate);

      if (toDate) {
        const endDay = new Date(toDate);
        endDay.setHours(23, 59, 59, 999);
        match.createdAt.$lte = endDay;
      }
    }

    const sortOrder = order === "asc" ? 1 : -1;

    let query = Site.find(match).sort({ createdAt: sortOrder });

    const total = await Site.countDocuments(match);

    if (isPagination === "true") {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;

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
            ? Math.ceil(total / (parseInt(limit) || 10))
            : 1,
        currentPage: parseInt(page) || 1,
      },
      200
    );
  } catch (err) {
    console.error("Get Sites Error:", err);
    return sendError(res, "Failed to fetch sites", 500, err.message);
  }
};

// ---------------------------------------------------------
// UPDATE SITE
// ---------------------------------------------------------
export const updateSite = async (req, res) => {
  try {
    const { siteName, siteAddress, siteType } = req.body;

    // Duplicate check for updated name
    if (siteName) {
      const existing = await Site.findOne({
        _id: { $ne: req.params.id },
        siteName: { $regex: `^${siteName.trim()}$`, $options: "i" },
      });
      if (existing) {
        return sendError(
          res,
          "Another site with this name already exists",
          400
        );
      }
    }

    const site = await Site.findByIdAndUpdate(
      req.params.id,
      {
        ...(siteName && { siteName: siteName.trim() }),
        ...(siteAddress && { siteAddress: siteAddress.trim() }),
        ...(siteType && { siteType }),
        ...(req.body.status !== undefined && { status: req.body.status }),
      },
      { new: true }
    );

    if (!site) return sendError(res, "Site not found", 404);

    return sendSuccess(res, "Site updated successfully", site, 200);
  } catch (err) {
    console.error("Update Site Error:", err);
    return sendError(res, "Failed to update site", 500, err.message);
  }
};

// ---------------------------------------------------------
// DELETE SITE
// ---------------------------------------------------------
export const deleteSite = async (req, res) => {
  try {
    const site = await Site.findByIdAndDelete(req.params.id);

    if (!site) return sendError(res, "Site not found", 404);

    return sendSuccess(res, "Site deleted successfully", null, 200);
  } catch (err) {
    console.error("Delete Site Error:", err);
    return sendError(res, "Failed to delete site", 500, err.message);
  }
};