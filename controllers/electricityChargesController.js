import ElectricityCharges from "../models/ElectricitychargesRate.modal.js";
import Unit from "../models/masters/Unit.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

/**
 * 🟢 CREATE / UPDATE Electricity Charges
 */
export const createElectricityCharge = async (req, res) => {
  try {
    const {
      siteId,
      unitId,
      tariffGrid,
      dgTariff,
      surchargePercent = 0,
      effectiveFrom,
      isActive = true,
    } = req.body;

    if (!siteId || !unitId || tariffGrid == null || dgTariff == null)
      return sendError(res, "siteId, unitId, tariffGrid and dgTariff are required");

    // Check if a charge already exists for site + unit
    const existingCharge = await ElectricityCharges.findOne({ siteId, unitId });

    let result;
    if (existingCharge) {
      // 🔁 Update existing
      existingCharge.tariffGrid = tariffGrid;
      existingCharge.dgTariff = dgTariff;
      existingCharge.surchargePercent = surchargePercent;
      existingCharge.effectiveFrom = effectiveFrom ?? existingCharge.effectiveFrom;
      existingCharge.isActive = isActive;
      await existingCharge.save();
      result = existingCharge;
    } else {
      // 🆕 Create new
      result = await ElectricityCharges.create({
        siteId,
        unitId,
        tariffGrid,
        dgTariff,
        surchargePercent,
        effectiveFrom,
        isActive,
      });
    }

    return sendSuccess(res, "Electricity charge saved successfully", result, 200);
  } catch (error) {
    console.error("Create Electricity Charge Error:", error);
    return sendError(res, error.message);
  }
};

/**
 * 🟡 GET All Electricity Charges
 */
export const getAllElectricityCharges = async (req, res) => {
  try {
    const {
      siteId,
      unitId,
      isActive,
      search = "",
      page = 1,
      limit = 10,
      sortBy = "effectiveFrom",
      order = "desc",
    } = req.query;

    const filters = {};
    if (siteId) filters.siteId = siteId;
    if (unitId) filters.unitId = unitId;
    if (isActive !== undefined) filters.isActive = isActive === "true";

    const sortOrder = order === "asc" ? 1 : -1;
    const sortOptions = { [sortBy]: sortOrder };

    let query = ElectricityCharges.find(filters)
      .populate("siteId", "siteName")
      .populate("unitId", "unitNumber")
      .sort(sortOptions);

    const charges = await query.exec();

    // Search (siteName / unitNumber)
    const searchRegex = new RegExp(search, "i");
    const searchedCharges = search
      ? charges.filter((item) => {
          const siteName = item?.siteId?.siteName || "";
          const unitNumber = item?.unitId?.unitNumber || "";
          return siteName.match(searchRegex) || unitNumber.match(searchRegex);
        })
      : charges;

    // Pagination
    const total = searchedCharges.length;
    const paginatedData = searchedCharges.slice((page - 1) * limit, page * limit);

    return sendSuccess(res, "Electricity charges fetched successfully", {
      data: paginatedData,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
    }, 200);
  } catch (error) {
    console.error("Get All Electricity Charges Error:", error);
    return sendError(res, error.message);
  }
};

/**
 * 🟠 GET Single Electricity Charge by ID
 */
export const getElectricityChargeById = async (req, res) => {
  try {
    const { id } = req.params;
    const charge = await ElectricityCharges.findById(id)
      .populate("siteId", "siteName")
      .populate("unitId", "unitNumber");

    if (!charge) return sendError(res, "Electricity charge not found");
    return sendSuccess(res, "Electricity charge fetched successfully", charge);
  } catch (error) {
    console.error("Get Electricity Charge by ID Error:", error);
    return sendError(res, error.message);
  }
};

/**
 * 🔵 UPDATE Electricity Charge
 */
export const updateElectricityCharge = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedCharge = await ElectricityCharges.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedCharge) return sendError(res, "Electricity charge not found");

    return sendSuccess(res, "Electricity charge updated successfully", updatedCharge);
  } catch (error) {
    console.error("Update Electricity Charge Error:", error);
    return sendError(res, error.message);
  }
};

/**
 * 🔴 DELETE Electricity Charge
 */
export const deleteElectricityCharge = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCharge = await ElectricityCharges.findByIdAndDelete(id);
    if (!deletedCharge) return sendError(res, "Electricity charge not found");

    return sendSuccess(res, "Electricity charge deleted successfully", deletedCharge);
  } catch (error) {
    console.error("Delete Electricity Charge Error:", error);
    return sendError(res, error.message);
  }
};
