// controllers/unit.controller.js
import mongoose from "mongoose";
import Unit from "../models/masters/Unit.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

// ✅ Create Unit
export const createUnit1 = async (req, res) => {
  try {
    const {
      unitNumber,
      block,
      floor,
      areaSqFt,
      siteId,
      projectId,
      unitTypeId,
      status,
    } = req.body;

    // 🔹 Validation
    if (
      !unitNumber ||
      typeof unitNumber !== "string" ||
      unitNumber.trim() === ""
    ) {
      return sendError(
        res,
        "unitNumber is required and must be a non-empty string",
        400
      );
    }
    if (!siteId) return sendError(res, "siteId is required", 400);
    // if (!projectId) return sendError(res, "projectId is required", 400);
    // if (!unitTypeId) return sendError(res, "unitTypeId is required", 400);

    // // 🔍 Check duplicate unitNumber
    // const existing = await Unit.findOne({ unitNumber: unitNumber.trim() });
    // if (existing)
    //   return sendError(res, "Unit with this unitNumber already exists", 400);

    const unit = await Unit.create({
      unitNumber: unitNumber.trim(),
      block,
      floor,
      areaSqFt,
      siteId,
      projectId,
      unitTypeId,
      status,
    });

    return sendSuccess(res, "Unit created successfully", unit, 201);
  } catch (err) {
    console.error("Create Unit Error:", err);
    return sendError(res, "Failed to create Unit", 500, err.message);
  }
};

export const createUnit = async (req, res) => {
  try {
    const {
      unitNumber,
      block,
      floor,
      areaSqFt,
      siteId,
      projectId,
      unitTypeId,
      status,
    } = req.body;

    // 🔹 Validation
    if (!unitNumber || typeof unitNumber !== "string" || unitNumber.trim() === "") {
      return sendError(res, "unitNumber is required and must be a non-empty string", 400);
    }

    if (!siteId) return sendError(res, "siteId is required", 400);

    // Prepare payload
    const payload = {
      unitNumber: unitNumber.trim(),
      block,
      floor,
      areaSqFt,
      siteId,
      projectId,
      status,
    };

    // Only include unitTypeId if it's valid
    if (unitTypeId && unitTypeId.trim() !== "") {
      payload.unitTypeId = unitTypeId;
    }

    const unit = await Unit.create(payload);

    return sendSuccess(res, "Unit created successfully", unit, 201);
  } catch (err) {
    console.error("Create Unit Error:", err);
    return sendError(res, "Failed to create Unit", 500, err.message);
  }
};


export const getAllUnits = async (req, res) => {
  try {
    const {
      search,
      siteId,
      projectId,
      unitTypeId,
      landlordId,
      status,
      fromDate,
      toDate,
      order = "desc",
      isPagination = "true",
      page = 1,
      limit = 10,
    } = req.query;

    console.log("All unit query", req.query);


    const match = {};

    // 🔍 Search filter
    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      match.$or = [
        { unitNumber: { $regex: regex } },
        { block: { $regex: regex } },
        { floor: { $regex: regex } },
      ];
    }

    // 🎯 Basic filters
    if (siteId && siteId !== "null" && siteId !== "undefined")
      match.siteId = siteId;
    if (projectId && projectId !== "null" && projectId !== "undefined")
      match.projectId = projectId;
    if (unitTypeId && unitTypeId !== "null" && unitTypeId !== "undefined")
      match.unitTypeId = unitTypeId;
    if (status !== undefined && status !== "null" && status !== "undefined")
      match.status = status === "true";

    // 🆕 Proper landlordId filter
    if (landlordId && mongoose.Types.ObjectId.isValid(landlordId)) {
      match.landlordId = new mongoose.Types.ObjectId(landlordId);
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
    console.log("Unit filters", match);

    const sortOrder = order === "asc" ? 1 : -1;

    let query = Unit.find(match)
      .populate("siteId", "siteName")
      .populate("unitTypeId", "title")
      .populate("landlordId", "name phone email")
      .populate({
        path: "landlordHistory.landlordId",
        select: "name phone email",
      })
      .populate({
        path: "tenantHistory.tenantId",
        select: "name phone email",
      })
      .sort({ createdAt: sortOrder });

    const total = await Unit.countDocuments(match);
    if (isPagination === "true") {
      query.skip((page - 1) * parseInt(limit)).limit(parseInt(limit));
    }

    const units = await query;

    return sendSuccess(
      res,
      units.length ? "Units fetched successfully" : "No units found.",
      {
        units,
        totalUnits: total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
      200
    );
  } catch (err) {
    console.error("Get Units Error:", err);
    return sendError(res, "Failed to fetch Units", 500, err.message);
  }
};

export const updateUnit = async (req, res) => {
  try {
    const {
      unitNumber,
      block,
      floor,
      areaSqFt,
      siteId,
      projectId,
      unitTypeId,
      status,
    } = req.body;

    const updateData = {};

    if (unitNumber?.trim()) updateData.unitNumber = unitNumber.trim();
    if (block) updateData.block = block;
    if (floor) updateData.floor = floor;
    if (areaSqFt) updateData.areaSqFt = areaSqFt;
    if (siteId) updateData.siteId = siteId;
    if (projectId) updateData.projectId = projectId;
    if (unitTypeId) updateData.unitTypeId = unitTypeId; // only update if provided
    if (typeof status === "boolean") updateData.status = status;

    const unit = await Unit.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    if (!unit) return sendError(res, "Unit not found", 404);

    return sendSuccess(res, "Unit updated successfully", unit, 200);
  } catch (err) {
    return sendError(res, "Failed to update Unit", 500, err.message);
  }
};


// ✅ Delete Unit
export const deleteUnit = async (req, res) => {
  try {
    const unit = await Unit.findByIdAndDelete(req.params.id);
    if (!unit) return sendError(res, "Unit not found", 404);

    return sendSuccess(res, "Unit deleted successfully", null, 200);
  } catch (err) {
    return sendError(res, "Failed to delete Unit", 500, err.message);
  }
};
