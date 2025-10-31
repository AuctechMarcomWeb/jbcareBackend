import MaintainCharges from "../models/MantainCharge.modal.js";
import MaintenanceBill from "../models/MaintenanceBill.modal.js";
import Unit from "../models/masters/Unit.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";
import { generateMaintenanceBillCore } from "../services/maintenanceBillService.js";

/**
 * 🧾 Generate or Overwrite Maintenance Bill (Admin)
 * Calculates maintenance based on rateType, area, and billing cycle
 */
export const generateMaintenanceBill = async (req, res) => {
  try {
    const result = await generateMaintenanceBillCore(req.body);
console.log();

    if (!result.success) {
      return sendError(res, result.message);
    }

    return sendSuccess(res, result.message, result.data);
  } catch (error) {
    return sendError(res, error.message);
  }
};

export const getAllMaintenanceBills = async (req, res) => {
  try {
    const {
      siteId,
      unitId,
      landlordId,
      status,
      search = "",
      fromDate,
      toDate,
      isPagination = "true",
      page = 1,
      limit = 10,
      sortBy = "generatedOn",
      order = "desc",
    } = req.query;

    const filters = {};

    // 🔹 Base filters
    if (siteId) filters.siteId = siteId;
    if (unitId) filters.unitId = unitId;
    if (landlordId) filters.landlordId = landlordId;
    if (status) filters.status = status;

    // 🔹 Date filter (based on fromDate / toDate)
    if (fromDate || toDate) {
      filters.generatedOn = {};
      if (fromDate) filters.generatedOn.$gte = new Date(fromDate);
      if (toDate) filters.generatedOn.$lte = new Date(toDate);
    }

    // 🔹 Search (case-insensitive)
    const searchRegex = new RegExp(search, "i");

    // 🔹 Sort setup
    const sortOrder = order === "asc" ? 1 : -1;
    const sortOptions = { [sortBy]: sortOrder };

    // 🔹 Mongo aggregation (handles populate + search efficiently)
    const pipeline = [
      { $match: filters },
      {
        $lookup: {
          from: "sites",
          localField: "siteId",
          foreignField: "_id",
          as: "site",
        },
      },
      { $unwind: { path: "$site", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "units",
          localField: "unitId",
          foreignField: "_id",
          as: "unit",
        },
      },
      { $unwind: { path: "$unit", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "landlords",
          localField: "landlordId",
          foreignField: "_id",
          as: "landlord",
        },
      },
      { $unwind: { path: "$landlord", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $or: [
            { "site.name": { $regex: searchRegex } },
            { "unit.name": { $regex: searchRegex } },
            { "landlord.name": { $regex: searchRegex } },
            { status: { $regex: searchRegex } },
          ],
        },
      },
      { $sort: sortOptions },
    ];

    // 🔹 Pagination logic
    if (isPagination === "true") {
      const skip = (Number(page) - 1) * Number(limit);
      pipeline.push({ $skip: skip }, { $limit: Number(limit) });
    }

    // 🔹 Execute pipeline
    const data = await MaintenanceBill.aggregate(pipeline);

    // 🔹 Count total matching docs (without pagination)
    const total = await MaintenanceBill.countDocuments(filters);

    return sendSuccess(res, "Maintenance bills fetched successfully", {
      total,
      currentPage: Number(page),
      totalPages: isPagination === "true" ? Math.ceil(total / limit) : 1,
      data,
    });
  } catch (error) {
    console.error("Get All Maintenance Bills Error:", error);
    return sendError(res, error.message);
  }
};

export const updateMaintenanceBill = async (req, res) => {
  try {
    const { billId, ...updateFields } = req.body;

    // 🔹 Validate billId
    if (!billId) {
      return sendError(res, "Missing required field: billId");
    }

    // 🔹 Protect critical fields
    const protectedFields = ["_id", "createdAt", "updatedAt"];
    protectedFields.forEach((field) => delete updateFields[field]);

    // 🔹 Always update timestamp
    updateFields.updatedOn = new Date();

    // 🔹 Update the bill
    const updatedBill = await MaintenanceBill.findByIdAndUpdate(
      billId,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedBill) {
      return sendError(res, "Maintenance bill not found.");
    }

    return sendSuccess(
      res,
      "Maintenance bill updated successfully",
      updatedBill
    );
  } catch (error) {
    console.error("Update Maintenance Bill Error:", error);
    return sendError(res, error.message);
  }
};
