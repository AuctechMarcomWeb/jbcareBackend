import Bills from "../models/Bills.modal.js";
import mongoose from "mongoose";
import { sendError, sendSuccess } from "../utils/responseHandler.js"; // optional utility
import PaymentLedger from "../models/paymentLedger.modal.js";

const createBill1 = async (req, res) => {
  try {
    const {
      landlordId,
      siteId,
      unitId,
      fromDate,
      toDate,
      electricity,
      maintenance
    } = req.body;

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
export const createBill = async (req, res) => {
  try {
    const {
      landlordId,
      siteId,
      unitId,
      toDate,
      fromDate,
      electricity,
      maintenance
    } = req.body;

    // Validate required fields
    if (!landlordId || !siteId || !unitId || !fromDate || !toDate) {
      return sendError(res, "Missing required fields");
    }

    const newFrom = new Date(fromDate);
    const newTo = new Date(toDate);

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





    // ⛔ Correct Date-Range Overlap Check
    const existingBill = await Bills.findOne({
      landlordId,
      siteId,
      unitId,

      fromDate: { $lte: newTo },
      toDate: { $gte: newFrom },
    });

    if (existingBill) {
      return sendError(
        res,
        "Bill already exists for this landlord, site, unit and date range"
      );
    }
    // Create new bill
    const bill = await Bills.create({
      landlordId,
      siteId,
      unitId,
      electricity,
      maintenance,
      totalAmount,
      fromDate: newFrom,
      toDate: newTo,
    });

    // ✔ Get last ledger entry
    const lastEntry = await PaymentLedger.findOne({
      landlordId,
      siteId,
      unitId,
    }).sort({ entryDate: -1 });

    console.log("lastEntry", lastEntry);

    const openingBalance = lastEntry ? lastEntry?.closingBalance : 0;

    console.log("lastEntry", openingBalance);

    const entryType = "Debit";
    const debitAmount = totalAmount;
    const creditAmount = 0;

    // closing balance decreases because it's debit
    const closingBalance = openingBalance - debitAmount;

    // ✔ Create Ledger Entry
    await PaymentLedger.create({
      landlordId,
      siteId,
      unitId,
      remark: "Bill Generated",
      description: "Monthly Bill Added",
      paymentMode: "Online", // set if needed
      entryType,
      debitAmount,
      creditAmount,
      openingBalance,
      closingBalance,
      entryDate: new Date(),
    });


    return sendSuccess(res, bill, "Bill created successfully");
  } catch (error) {
    return sendError(res, `Error: ${error.message}`);
  }
};



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

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    // -----------------------------
    // ⭐ BILL PERIOD FILTER (fromDate + toDate)
    // -----------------------------
    if (fromDate || toDate) {
      const start = fromDate
        ? new Date(new Date(fromDate).setHours(0, 0, 0, 0))
        : null;

      const end = toDate
        ? new Date(new Date(toDate).setHours(23, 59, 59, 999))
        : null;

      if (start && end) {
        // overlap condition:
        filters.$and = [
          { fromDate: { $lte: end } },
          { toDate: { $gte: start } },
        ];
      } else if (start && !end) {
        // match bills that end after start date
        filters.toDate = { $gte: start };
      } else if (!start && end) {
        // match bills that start before end date
        filters.fromDate = { $lte: end };
      }
    }

    // --------------------------------
    // FETCH BILLS
    // --------------------------------
    const bills = await Bills.find(filters)
      .populate("landlordId", "name")
      .populate("siteId", "siteName")
      .populate("unitId", "unitNumber")
      .sort({ fromDate: -1 }) // 👈 sorted by billing period
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Bills.countDocuments(filters);

    return sendSuccess(res, "Bills fetched successfully", {
      data: bills,
      total,
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("Get Bills Error:", error);
    return sendError(res, error.message);
  }
};


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

export const updateBill1 = async (req, res) => {
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

export const updateBill = async (req, res) => {
  const { id } = req.params;

  try {
    const bill = await Bills.findById(id);
    if (!bill) {
      return sendError(res, "Bill not found");
    }

    // Sirf wahi fields update hongi jo req.body me aayengi
    Object.keys(req.body).forEach((key) => {
      bill[key] = req.body[key];
    });

    await bill.save();

    return sendSuccess(res, "Bill updated successfully", bill);
  } catch (error) {
    return sendError(res, error.message);
  }
};





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
