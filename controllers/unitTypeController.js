import UnitType from "../models/masters/UnitType.modal.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";

// Create a new UnitType
export const createUnitType = async (req, res) => {
  try {
    const unitType = await UnitType.create(req.body);
    return sendSuccess(res, "UnitType created successfully", unitType, 201);
  } catch (err) {
    return sendError(res, "Failed to create UnitType", 400, err.message);
  }
};

// Get all UnitTypes
export const getAllUnitTypes = async (req, res) => {
  try {
    const unitTypes = await UnitType.find();
    return sendSuccess(res, "UnitTypes fetched successfully", unitTypes, 200);
  } catch (err) {
    return sendError(res, "Failed to fetch UnitTypes", 500, err.message);
  }
};

// Update a UnitType by ID
export const updateUnitType = async (req, res) => {
  try {
    const unitType = await UnitType.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!unitType) return sendError(res, "UnitType not found", 404);

    return sendSuccess(res, "UnitType updated successfully", unitType, 200);
  } catch (err) {
    return sendError(res, "Failed to update UnitType", 400, err.message);
  }
};

// Delete a UnitType by ID
export const deleteUnitType = async (req, res) => {
  try {
    const unitType = await UnitType.findByIdAndDelete(req.params.id);
    if (!unitType) return sendError(res, "UnitType not found", 404);

    return sendSuccess(res, "UnitType deleted successfully", null, 200);
  } catch (err) {
    return sendError(res, "Failed to delete UnitType", 400, err.message);
  }
};
