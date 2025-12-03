import Bills from "../models/Bills.modal.js";
import mongoose from "mongoose";
import { sendError, sendSuccess } from "../utils/responseHandler.js"; // optional utility

/**
 * 🟢 CREATE Bill
 */
export const createBill = async (req, res) => {
  try {
    const { landlordId, siteId, unitId, fromDate, toDate, electricity, maintenance } = req.body;

    if (!landlordId || !siteId || !unitId)
      return sendError(res, "landlordId, siteId and unitId are required");

    // Calculate totals if not provided
    if (electricity) {
      electricity.consumedUnits = electricity.currentReading - electricity.previousReading;
      electricity.dgConsumedUnits = electricity.dgCurrentReading - electricity.dgPreviousReading;
      electricity.electricityAmount = electricity.consumedUnits * electricity.tariffRate;
      electricity.dgAmount = electricity.dgConsumedUnits * (electricity.dgTariff || 0);
      electricity.surchargeAmount = ((electricity.electricityAmount + electricity.dgAmount) * (electricity.surchargePercent || 0)) / 100;
    }

    if (maintenance) {
      maintenance.SqftAmount = maintenance.SqftArea * (maintenance.SqftRate || 0);
      maintenance.maintenanceAmount = (maintenance.fixedAmount || 0) + maintenance.SqftAmount;
    }

    const totalAmount =
      (electricity?.electricityAmount || 0) +
      (electricity?.dgAmount || 0) +
      (electricity?.surchargeAmount || 0) +
      (maintenance?.maintenanceAmount || 0);

    const bill = await Bills.create({
      landlordId,
      siteId,
      unitId,
      fromDate,
      toDate,
      electricity,
      maintenance,
      totalAmount,
    });

    return sendSuccess(res, "Bill created successfully", bill, 201);
  } catch (error) {
    console.error("Create Bill Error:", error);
    return sendError(res, error.message);
  }
};

/**
 * 📋 GET All Bills (with filters & pagination)
 */
export const getAllBills = async (req, res) => {
  try {
    const {
      landlordId,
      siteId,
      unitId,
      status,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
    } = req.query;

    const filters = {};
    if (landlordId) filters.landlordId = landlordId;
    if (siteId) filters.siteId = siteId;
    if (unitId) filters.unitId = unitId;
    if (status) filters.status = status;

    // 🔹 Date range filter
    if (fromDate || toDate) {
      filters.generatedOn = {};
      if (fromDate)
        filters.generatedOn.$gte = new Date(new Date(fromDate).setHours(0, 0, 0, 0));
      if (toDate)
        filters.generatedOn.$lte = new Date(new Date(toDate).setHours(23, 59, 59, 999));
    }

    const bills = await Bills.find(filters)
      .populate("landlordId", "name")
      .populate("siteId", "siteName")
      .populate("unitId", "unitNumber")
      .sort({ generatedOn: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Bills.countDocuments(filters);

    return sendSuccess(res, "Bills fetched successfully", {
      data: bills,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get All Bills Error:", error);
    return sendError(res, error.message);
  }
};



/**
 * 🔍 GET Single Bill by ID
 */
export const getBillById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return sendError(res, "Invalid Bill ID");

    const bill = await Bills.findById(id)
      .populate("landlordId", "name")
      .populate("siteId", "siteName")
      .populate("unitId", "unitNumber");

    if (!bill) return sendError(res, "Bill not found");
    return sendSuccess(res, "Bill fetched successfully", bill);
  } catch (error) {
    console.error("Get Bill Error:", error);
    return sendError(res, error.message);
  }
};

/**
 * ✏️ UPDATE Bill
 */
export const updateBill = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Optional: recalculate totals if electricity/maintenance is updated
    if (updateData.electricity) {
      const e = updateData.electricity;
      e.consumedUnits = e.currentReading - e.previousReading;
      e.dgConsumedUnits = e.dgCurrentReading - e.dgPreviousReading;
      e.electricityAmount = e.consumedUnits * e.tariffRate;
      e.dgAmount = e.dgConsumedUnits * (e.dgTariff || 0);
      e.surchargeAmount = ((e.electricityAmount + e.dgAmount) * (e.surchargePercent || 0)) / 100;
    }

    if (updateData.maintenance) {
      const m = updateData.maintenance;
      m.SqftAmount = m.SqftArea * (m.SqftRate || 0);
      m.maintenanceAmount = (m.fixedAmount || 0) + m.SqftAmount;
    }

    // Recalculate total amount
    const totalAmount =
      (updateData.electricity?.electricityAmount || 0) +
      (updateData.electricity?.dgAmount || 0) +
      (updateData.electricity?.surchargeAmount || 0) +
      (updateData.maintenance?.maintenanceAmount || 0);
    updateData.totalAmount = totalAmount;

    const updatedBill = await Bills.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedBill) return sendError(res, "Bill not found");
    return sendSuccess(res, "Bill updated successfully", updatedBill);
  } catch (error) {
    console.error("Update Bill Error:", error);
    return sendError(res, error.message);
  }
};

/**
 * ❌ DELETE Bill
 */
export const deleteBill = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return sendError(res, "Invalid Bill ID");

    const deletedBill = await Bills.findByIdAndDelete(id);
    if (!deletedBill) return sendError(res, "Bill not found");
    return sendSuccess(res, "Bill deleted successfully", deletedBill);
  } catch (error) {
    console.error("Delete Bill Error:", error);
    return sendError(res, error.message);
  }
};
