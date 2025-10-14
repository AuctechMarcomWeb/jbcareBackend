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

export const getAllSites = async (req, res) => {
  try {
    const {
      search,
      fromDate,
      toDate,
      isPagination = "true",
      page = 1,
      limit = 10,
    } = req.query;

    const match = {};

    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      match.$or = [
        { name: { $regex: regex } },
        { location: { $regex: regex } },
        { city: { $regex: regex } },
      ];
    }

    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) {
        match.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        const nextDay = new Date(toDate);
        nextDay.setDate(nextDay.getDate() + 1);
        match.createdAt.$lt = nextDay;
      }
    }

    const query = Site.find(match).sort({ createdAt: -1 });

    let total = await Site.countDocuments(match);
    if (isPagination === "true") {
      query.skip((page - 1) * limit).limit(parseInt(limit));
    }

    const sites = await query;

    return sendSuccess(
      res,
      "Sites fetched successfully",
      {
        sites,
        totalSites: total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
      200
    );
  } catch (err) {
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
