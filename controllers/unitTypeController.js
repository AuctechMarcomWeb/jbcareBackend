import UnitType from "../models/masters/UnitType.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

export const createUnitType = async (req, res) => {
  try {
    const { title, status } = req.body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return sendError(
        res,
        "Title is required and must be a non-empty string",
        400
      );
    }

    const existing = await UnitType.findOne({
      title: { $regex: `^${title.trim()}$`, $options: "i" },
    });
    if (existing)
      return sendError(res, "UnitType with this title already exists", 400);

    const unitType = await UnitType.create({ title: title.trim(), status });

    return sendSuccess(res, "UnitType created successfully", unitType, 201);
  } catch (err) {
    console.error("Create UnitType Error:", err);
    return sendError(res, "Failed to create UnitType", 500, err.message);
  }
};

export const getAllUnitTypes = async (req, res) => {
  try {
    const {
      search,
      status,
      isPagination = "true",
      page = 1,
      limit = 10,
    } = req.query;

    const match = {};

    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      match.title = { $regex: regex };
    }

    if (status !== undefined) {
      match.status = status === "true";
    }

    let query = UnitType.find(match).sort({ createdAt: -1 });

    const total = await UnitType.countDocuments(match);

    if (isPagination === "true") {
      query = query.skip((page - 1) * parseInt(limit)).limit(parseInt(limit));
    }

    const unitTypes = await query;

    return sendSuccess(
      res,
      "UnitTypes fetched successfully",
      {
        unitTypes,
        totalUnitTypes: total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
      200
    );
  } catch (err) {
    return sendError(res, "Failed to fetch UnitTypes", 500, err.message);
  }
};

// ✅ Update UnitType
export const updateUnitType = async (req, res) => {
  try {
    const { title, status } = req.body;

    // 🔹 Optional: validate title if provided
    if (title && (typeof title !== "string" || title.trim() === "")) {
      return sendError(res, "Title must be a non-empty string", 400);
    }

    // 🔍 Check for duplicate title if updating
    if (title) {
      const existing = await UnitType.findOne({
        _id: { $ne: req.params.id },
        title: { $regex: `^${title.trim()}$`, $options: "i" },
      });
      if (existing)
        return sendError(
          res,
          "Another UnitType with this title already exists",
          400
        );
    }

    const unitType = await UnitType.findByIdAndUpdate(
      req.params.id,
      { title: title?.trim(), status },
      { new: true }
    );

    if (!unitType) return sendError(res, "UnitType not found", 404);

    return sendSuccess(res, "UnitType updated successfully", unitType, 200);
  } catch (err) {
    return sendError(res, "Failed to update UnitType", 500, err.message);
  }
};

// ✅ Delete UnitType
export const deleteUnitType = async (req, res) => {
  try {
    const unitType = await UnitType.findByIdAndDelete(req.params.id);
    if (!unitType) return sendError(res, "UnitType not found", 404);

    return sendSuccess(res, "UnitType deleted successfully", null, 200);
  } catch (err) {
    return sendError(res, "Failed to delete UnitType", 500, err.message);
  }
};
