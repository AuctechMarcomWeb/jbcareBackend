import MaintainCharges from "../models/MantainCharge.modal.js";
import Unit from "../models/masters/Unit.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js"; // optional utility handlers

/**
 * 🟢 CREATE Maintenance Charge
 */
export const createMaintainCharge = async (req, res) => {
  try {
    const {
      siteId,
      unitId,
      rateType,
      rateValue,
      gstPercent,
      effectiveFrom,
      isActive,
    } = req.body;

    if (!siteId || !unitId || !rateValue)
      return sendError(res, "siteId, unitId and rateValue are required");

    const newCharge = await MaintainCharges.create({
      siteId,
      unitId,
      rateType,
      rateValue,
      gstPercent,
      effectiveFrom,
      isActive,
    });

    return sendSuccess(res, "Maintenance charge added successfully", newCharge);
  } catch (error) {
    console.error("Create Maintain Charge Error:", error);
    return sendError(res, error.message);
  }
};

/**
 * 🟡 READ / GET All Maintenance Charges
 */
export const getAllMaintainCharges = async (req, res) => {
  try {
    const {
      siteId,
      unitId,
      isActive,
      search = "",
      fromDate,
      toDate,
      isPagination = "true",
      page = 1,
      limit = 10,
      sortBy = "effectiveFrom",
      order = "desc",
    } = req.query;

    const filters = {};

    // 🔹 Base filters
    if (siteId) filters.siteId = siteId;
    if (unitId) filters.unitId = unitId;
    if (isActive !== undefined) filters.isActive = isActive === "true";

    // 🔹 Date filter (effectiveFrom)
    if (fromDate || toDate) {
      const dateFilter = {};
      if (fromDate) {
        // Start of day
        dateFilter.$gte = new Date(new Date(fromDate).setHours(0, 0, 0, 0));
      }
      if (toDate) {
        // End of day
        dateFilter.$lte = new Date(new Date(toDate).setHours(23, 59, 59, 999));
      }
      filters.effectiveFrom = dateFilter;
    }

    // 🔹 Search setup
    const searchRegex = new RegExp(search, "i");

    // 🔹 Sorting
    const sortOrder = order === "asc" ? 1 : -1;
    const sortOptions = { [sortBy]: sortOrder };

    // 🔹 Query with populate
    const charges = await MaintainCharges.find(filters)
      .populate("siteId", "siteName")
      .populate("unitId", "unitNumber")
      .sort(sortOptions);

    // 🔹 Manual search (populate fields)
    const searchedCharges = search
      ? charges.filter(
          (item) =>
            item?.siteId?.name?.match(searchRegex) ||
            item?.unitId?.name?.match(searchRegex) ||
            item?.rateType?.match(searchRegex)
        )
      : charges;

    // 🔹 Pagination logic
    const total = searchedCharges.length;
    let paginatedData = searchedCharges;

    if (isPagination === "true") {
      const startIndex = (page - 1) * limit;
      paginatedData = searchedCharges.slice(
        startIndex,
        startIndex + Number(limit)
      );
    }

    return sendSuccess(
      res,
      "Maintenance charges fetched successfully",
      {
        data: paginatedData,
        total,
        currentPage: Number(page),
        totalPages: isPagination === "true" ? Math.ceil(total / limit) : 1,
      },
      200
    );
  } catch (error) {
    console.error("Get All Maintain Charges Error:", error);
    return sendError(res, error.message);
  }
};

/**
 * 🟠 GET Single Maintenance Charge by ID
 */
export const getMaintainChargeById = async (req, res) => {
  try {
    const { id } = req.params;
    const charge = await MaintainCharges.findById(id)
      .populate("siteId", "siteName")
      .populate("unitId", "unitNumber");

    if (!charge) return sendError(res, "Maintenance charge not found");
    return sendSuccess(res, "Maintenance charge fetched successfully", charge);
  } catch (error) {
    console.error("Get Maintain Charge by ID Error:", error);
    return sendError(res, error.message);
  }
};

/**
 * 🔵 UPDATE Maintenance Charge
 */
export const updateMaintainCharge = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedCharge = await MaintainCharges.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
      }
    );

    if (!updatedCharge) return sendError(res, "Maintenance charge not found");
    return sendSuccess(
      res,
      "Maintenance charge updated successfully",
      updatedCharge
    );
  } catch (error) {
    console.error("Update Maintain Charge Error:", error);
    return sendError(res, error.message);
  }
};

/**
 * 🔴 DELETE Maintenance Charge
 */
export const deleteMaintainCharge = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCharge = await MaintainCharges.findByIdAndDelete(id);

    if (!deletedCharge) return sendError(res, "Maintenance charge not found");
    return sendSuccess(
      res,
      "Maintenance charge deleted successfully",
      deletedCharge
    );
  } catch (error) {
    console.error("Delete Maintain Charge Error:", error);
    return sendError(res, error.message);
  }
};

export const createUserMaintainCharges = async (req, res) => {
  try {
    const {
      rateType = "fixed",
      rateValue = 100,
      gstPercent = 18,
      description = "User-defined dummy maintenance charge",
      overwriteExisting = false, // 🔹 New flag
    } = req.body;

    // ✅ Validation
    if (!rateValue || isNaN(rateValue)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid rateValue (number).",
      });
    }

    // ✅ Fetch all units
    const allUnits = await Unit.find({});
    if (!allUnits.length) {
      return res.status(404).json({
        success: false,
        message: "No units found in the database.",
      });
    }

    let createdCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;
    let createdCharges = [];

    for (const unit of allUnits) {
      const existing = await MaintainCharges.findOne({
        unitId: unit._id,
        isActive: true,
      });

      // ✅ If overwriteExisting = true → update even existing ones
      if (existing && overwriteExisting) {
        existing.rateType = rateType;
        existing.rateValue = rateValue;
        existing.gstPercent = gstPercent;
        existing.description = description;
        await existing.save();
        updatedCount++;
        continue;
      }

      // ✅ If overwriteExisting = false → skip existing
      if (existing && !overwriteExisting) {
        skippedCount++;
        continue;
      }

      // ✅ Create new dummy charge
      const newCharge = await MaintainCharges.create({
        rateType,
        rateValue,
        gstPercent,
        isActive: true,
        description,
        siteId: unit.siteId,
        unitId: unit._id,
      });

      createdCharges.push(newCharge);
      createdCount++;
    }

    return res.status(201).json({
      success: true,
      message: overwriteExisting
        ? `✅ Overwritten existing charges for ${updatedCount} unit(s). Created ${createdCount} new charges.`
        : `✅ Maintenance charges created for ${createdCount} unit(s). Skipped ${skippedCount} (already had charges).`,
      createdCount,
      updatedCount,
      skippedCount,
      data: createdCharges,
    });
  } catch (error) {
    console.error("❌ createUserMaintainCharges Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create or update maintenance charges.",
      error: error.message,
    });
  }
};
