import Unit from "../models/masters/Unit.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

// Create a new unit
export const createUnit = async (req, res) => {
  try {
    const unit = await Unit.create(req.body);
    return sendSuccess(res, "Unit created successfully", unit, 201);
  } catch (err) {
    return sendError(res, "Failed to create unit", 400, err.message);
  }
};

// Get all units with populated references
export const getAllUnits = async (req, res) => {
  try {
    const units = await Unit.find()
      .populate("siteId", "siteName")
      .populate("projectId", "projectName")
      .populate("unitTypeId", "title");

    return sendSuccess(res, "Units fetched successfully", units, 200);
  } catch (err) {
    return sendError(res, "Failed to fetch units", 500, err.message);
  }
};

// Update a unit by ID
export const updateUnit = async (req, res) => {
  try {
    const unit = await Unit.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!unit) return sendError(res, "Unit not found", 404);

    return sendSuccess(res, "Unit updated successfully", unit, 200);
  } catch (err) {
    return sendError(res, "Failed to update unit", 400, err.message);
  }
};

// Delete a unit by ID
export const deleteUnit = async (req, res) => {
  try {
    const unit = await Unit.findByIdAndDelete(req.params.id);
    if (!unit) return sendError(res, "Unit not found", 404);

    return sendSuccess(res, "Unit deleted successfully", null, 200);
  } catch (err) {
    return sendError(res, "Failed to delete unit", 400, err.message);
  }
};
