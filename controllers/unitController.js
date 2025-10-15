// controllers/unit.controller.js
import Unit from "../models/masters/Unit.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

// ✅ Create Unit
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
    if (!projectId) return sendError(res, "projectId is required", 400);
    if (!unitTypeId) return sendError(res, "unitTypeId is required", 400);

    // 🔍 Check duplicate unitNumber
    const existing = await Unit.findOne({ unitNumber: unitNumber.trim() });
    if (existing)
      return sendError(res, "Unit with this unitNumber already exists", 400);

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

// ✅ Get all Units with filters, search, pagination
export const getAllUnits = async (req, res) => {
  try {
    const {
      search,
      siteId,
      projectId,
      unitTypeId,
      status,
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
        { unitNumber: { $regex: regex } },
        { block: { $regex: regex } },
        { floor: { $regex: regex } },
      ];
    }

    if (siteId) match.siteId = siteId;
    if (projectId) match.projectId = projectId;
    if (unitTypeId) match.unitTypeId = unitTypeId;
    if (status !== undefined) match.status = status === "true";

    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) match.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const nextDay = new Date(toDate);
        nextDay.setDate(nextDay.getDate() + 1);
        match.createdAt.$lt = nextDay;
      }
    }

    let query = Unit.find(match)
      .populate("siteId", "siteName")
      .populate("projectId", "projectName")
      .populate("unitTypeId", "title")
      .populate("landlordId", "name phone email") // populate current landlord
      .populate({
        path: "landlordHistory.landlordId",
        select: "name phone email", // populate landlord details in history
      })
      .populate({
        path: "tenantHistory.tenantId",
        select: "name phone email", // populate tenant details in history
      })
      .sort({ createdAt: -1 });

    const total = await Unit.countDocuments(match);

    if (isPagination === "true") {
      query.skip((page - 1) * parseInt(limit)).limit(parseInt(limit));
    }

    const units = await query;

    return sendSuccess(
      res,
      "Units fetched successfully",
      {
        units,
        totalUnits: total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
      200
    );
  } catch (err) {
    return sendError(res, "Failed to fetch Units", 500, err.message);
  }
};

// ✅ Update Unit
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

    // 🔹 Optional: Validate unitNumber
    if (
      unitNumber &&
      (typeof unitNumber !== "string" || unitNumber.trim() === "")
    ) {
      return sendError(res, "unitNumber must be a non-empty string", 400);
    }

    // 🔍 Check duplicate if updating unitNumber
    if (unitNumber) {
      const existing = await Unit.findOne({
        _id: { $ne: req.params.id },
        unitNumber: unitNumber.trim(),
      });
      if (existing)
        return sendError(
          res,
          "Another Unit with this unitNumber already exists",
          400
        );
    }

    const unit = await Unit.findByIdAndUpdate(
      req.params.id,
      {
        unitNumber: unitNumber?.trim(),
        block,
        floor,
        areaSqFt,
        siteId,
        projectId,
        unitTypeId,
        status,
      },
      { new: true }
    );

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
