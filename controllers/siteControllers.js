import Site from "../models/masters/site.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

export const createSite = async (req, res) => {
  try {
    const site = await Site.create(req.body);
    return sendSuccess(res, "Site created successfully", site, 201);
  } catch (err) {
    return sendError(res, "Failed to create site", 400, err.message);
  }
};

// Get all sites
export const getAllSites = async (req, res) => {
  try {
    const sites = await Site.find();
    return sendSuccess(res, "Sites fetched successfully", sites, 200);
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
