import MaintainCharges from "../models/MantainCharge.modal.js";
import Unit from "../models/masters/Unit.modal.js";
import FixedCharges from "../models/utilsSchemas/FixedCharges.modal.js";
import Landlord from "../models/LandLord.modal.js";
import Tenant from "../models/Tenant.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js"; // optional utility handlers


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

    // 🔍 Check if maintenance charge already exists for this site + unit
    const existingCharge = await MaintainCharges.findOne({ siteId, unitId });


    let result;
    if (existingCharge) {
      // 🔁 Update existing charge
      existingCharge.rateType = rateType ?? existingCharge.rateType;
      existingCharge.rateValue = rateValue;
      existingCharge.gstPercent = gstPercent ?? existingCharge.gstPercent;
      existingCharge.effectiveFrom =
        effectiveFrom ?? existingCharge.effectiveFrom;
      existingCharge.isActive = isActive ?? existingCharge.isActive;
      await existingCharge.save();

      result = existingCharge;
    } else {
      // 🆕 Create new charge
      result = await MaintainCharges.create({
        siteId,
        unitId,
        rateType,
        rateValue,
        gstPercent,
        effectiveFrom,
        isActive,
      });
    }

    return sendSuccess(
      res,
      "Maintenance charge added successfully",
      result,
      200
    );
  } catch (error) {
    console.error("Create Maintain Charge Error:", error);
    return sendError(res, error.message);
  }
};


export const getAllMaintainCharges1 = async (req, res) => {
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

    const existingLandlord = await Landlord.findOne({
      isActive: true,
    });

    console.log("existingLandlord", existingLandlord);



    // 🔹 Date filter (effectiveFrom)
    if (fromDate || toDate) {
      const dateFilter = {};
      if (fromDate)
        dateFilter.$gte = new Date(new Date(fromDate).setHours(0, 0, 0, 0));
      if (toDate)
        dateFilter.$lte = new Date(new Date(toDate).setHours(23, 59, 59, 999));
      filters.effectiveFrom = dateFilter;
    }

    // 🔹 Sorting
    const sortOrder = order === "asc" ? 1 : -1;
    const sortOptions = { [sortBy]: sortOrder };

    // 🔹 Base query (populate)
    let query = MaintainCharges.find(filters)
      .populate("siteId", "siteName")
      .populate("unitId", "unitNumber")
      .sort(sortOptions);

    const charges = await query.exec();

    // ✅ Global search (in memory, but efficient on limited populated fields)
    const searchRegex = new RegExp(search, "i");

    const searchedCharges = search
      ? charges.filter((item) => {
        const siteName = item?.siteId?.siteName || "";
        const unitNumber = item?.unitId?.unitNumber || "";
        const rateType = item?.rateType || "";
        const description = item?.description || "";

        return (
          siteName.match(searchRegex) ||
          unitNumber.match(searchRegex) ||
          rateType.match(searchRegex) ||
          description.match(searchRegex)
        );
      })
      : charges;

    // 🔹 Pagination
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

    if (siteId) filters.siteId = siteId;
    if (unitId) filters.unitId = unitId;
    if (isActive !== undefined) filters.isActive = isActive === "true";

    if (fromDate || toDate) {
      filters.effectiveFrom = {};
      if (fromDate)
        filters.effectiveFrom.$gte = new Date(fromDate);
      if (toDate)
        filters.effectiveFrom.$lte = new Date(toDate);
    }

    const sortOrder = order === "asc" ? 1 : -1;

    const charges = await MaintainCharges.find(filters)
      .populate("siteId", "siteName siteType")
      .populate("unitId", "unitNumber")
      .sort({ [sortBy]: sortOrder });



    // 🔹 Attach Tenant & Landlord per Unit
    const finalData = await Promise.all(
      charges.map(async (item) => {
        const unit = await Unit.findOne().populate("landlordId", "name phone email").populate("tenantId", "name phone email");
        const tenant = await Tenant.findOne({
          unitId: item.unitId?._id,
          isActive: true,
        }).populate("landlordId", "name phone email");

        console.log("unit", unit);
        return {
          ...item.toObject(),
          tenant: unit.tenantId
            ? {
              _id: unit.tenantId._id,
              name: unit.tenantId.name,
              phone: unit.tenantId.phone,
              email: unit.tenantId.email,
            }
            : null,

          landlord: unit?.landlordId
            ? {
              _id: unit.landlordId._id,
              name: unit.landlordId.name,
              phone: unit.landlordId.phone,
              email: unit.landlordId.email,
            }
            : null,
        };
      })
    );

    // 🔹 Pagination
    const total = finalData.length;
    let paginatedData = finalData;

    if (isPagination === "true") {
      const startIndex = (page - 1) * limit;
      paginatedData = finalData.slice(startIndex, startIndex + Number(limit));
    }

    return sendSuccess(res, "Maintenance charges fetched successfully", {
      data: paginatedData,
      total,
      currentPage: Number(page),
      totalPages: isPagination === "true" ? Math.ceil(total / limit) : 1,
    });
  } catch (error) {
    console.error(error);
    return sendError(res, error.message);
  }
};


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

    // ✅ Save fixed charge globally (always store or update the latest one)
    let fixedCharge = await FixedCharges.findOne({});
    if (fixedCharge) {
      fixedCharge.rateType = rateType;
      fixedCharge.rateValue = rateValue;
      fixedCharge.gstPercent = gstPercent;
      fixedCharge.description = description;
      fixedCharge.overwriteExisting = overwriteExisting;
      await fixedCharge.save();
    } else {
      fixedCharge = await FixedCharges.create({
        rateType,
        rateValue,
        gstPercent,
        description,
        overwriteExisting,
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
      fixedCharge,
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

export const getFixedCharges = async (req, res) => {
  try {
    const charges = await FixedCharges.find({});

    if (!charges.length) {
      return res.status(404).json({
        success: false,
        message: "No fixed charges found.",
      });
    }

    return res.status(200).json({
      success: true,
      count: charges.length,
      message: "Fixed charges fetched successfully.",
      data: charges,
    });
  } catch (error) {
    console.error("❌ getFixedCharges Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch fixed charges.",
      error: error.message,
    });
  }
};

export const updateFixedChargeById = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      rateType,
      rateValue,
      gstPercent,
      description,
      overwriteExisting = false,
    } = req.body;

    // ✅ Validate rateValue
    if (rateValue && isNaN(rateValue)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid rateValue (number).",
      });
    }

    // ✅ Find and update the FixedCharge
    const fixedCharge = await FixedCharges.findById(id);
    if (!fixedCharge) {
      return res.status(404).json({
        success: false,
        message: "Fixed charge not found.",
      });
    }

    // Update fixed charge fields
    fixedCharge.rateType = rateType || fixedCharge.rateType;
    fixedCharge.rateValue = rateValue ?? fixedCharge.rateValue;
    fixedCharge.gstPercent = gstPercent ?? fixedCharge.gstPercent;
    fixedCharge.description = description || fixedCharge.description;
    fixedCharge.overwriteExisting = overwriteExisting;
    await fixedCharge.save();

    // ✅ Apply updated fixed charge to all units (like in createUserMaintainCharges)
    const allUnits = await Unit.find({});
    if (!allUnits.length) {
      return res.status(404).json({
        success: false,
        message: "No units found in the database.",
      });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let affectedCharges = [];

    for (const unit of allUnits) {
      const existing = await MaintainCharges.findOne({
        unitId: unit._id,
        isActive: true,
      });

      // ✅ If overwriteExisting = true → update all active records
      if (existing && overwriteExisting) {
        existing.rateType = fixedCharge.rateType;
        existing.rateValue = fixedCharge.rateValue;
        existing.gstPercent = fixedCharge.gstPercent;
        existing.description = fixedCharge.description;
        await existing.save();
        updatedCount++;
        continue;
      }

      // ✅ Skip if already exists and overwrite is false
      if (existing && !overwriteExisting) {
        skippedCount++;
        continue;
      }

      // ✅ Otherwise create new charge entry
      const newCharge = await MaintainCharges.create({
        rateType: fixedCharge.rateType,
        rateValue: fixedCharge.rateValue,
        gstPercent: fixedCharge.gstPercent,
        isActive: true,
        description: fixedCharge.description,
        siteId: unit.siteId,
        unitId: unit._id,
      });

      affectedCharges.push(newCharge);
      createdCount++;
    }

    return res.status(200).json({
      success: true,
      message: overwriteExisting
        ? `✅ Updated Fixed Charge and overwritten existing charges for ${updatedCount} unit(s).`
        : `✅ Updated Fixed Charge. Created ${createdCount} new charges and skipped ${skippedCount} existing.`,
      fixedCharge,
      createdCount,
      updatedCount,
      skippedCount,
      data: affectedCharges,
    });
  } catch (error) {
    console.error("❌ updateFixedChargeById Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update fixed charge.",
      error: error.message,
    });
  }
};

export const deleteFixedChargeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Fixed charge ID is required.",
      });
    }

    const deleted = await FixedCharges.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Fixed charge not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Fixed charge deleted successfully.",
      data: deleted,
    });
  } catch (error) {
    console.error("❌ deleteFixedChargeById Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete fixed charge.",
      error: error.message,
    });
  }
};
