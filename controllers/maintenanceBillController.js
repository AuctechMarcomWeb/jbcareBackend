import MaintainCharges from "../models/MantainCharge.modal.js";
import MaintenanceBill from "../models/maintainanceBill.modal.js";
import Unit from "../models/masters/Unit.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";


/**
 * 🧾 Generate or Overwrite Maintenance Bill (Admin)
 * Calculates maintenance based on rateType, area, and billing cycle
 */
export const generateMaintenanceBill = async (req, res) => {
  try {
    const { siteId, unitId, landlordId, billingCycle = "monthly" } = req.body;

    // 🔸 Validate required fields
    if (!siteId || !unitId || !landlordId) {
      return sendError(
        res,
        "Missing required fields (siteId, unitId, landlordId)"
      );
    }

    // 🔹 1. Fetch active maintenance charge
    const charge = await MaintainCharges.findOne({
      siteId,
      unitId,
      isActive: true,
    }).sort({ effectiveFrom: -1 });

    if (!charge) {
      return sendError(
        res,
        "No active maintenance charge found for this unit."
      );
    }

    // 🔹 2. Define billing period based on cycle
    const now = new Date();
    let fromDate, toDate;

    if (billingCycle === "monthly") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (billingCycle === "quarterly") {
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      fromDate = new Date(now.getFullYear(), quarterStart, 1);
      toDate = new Date(now.getFullYear(), quarterStart + 3, 0);
    } else if (billingCycle === "annual") {
      fromDate = new Date(now.getFullYear(), 0, 1);
      toDate = new Date(now.getFullYear(), 11, 31);
    } else {
      return sendError(
        res,
        "Invalid billing cycle. Use monthly, quarterly, or annual."
      );
    }

    // 🔹 3. Remove any existing bill for this unit and period
    await MaintenanceBill.deleteMany({
      siteId,
      unitId,
      landlordId,
      fromDate: { $lte: toDate },
      toDate: { $gte: fromDate },
    });

    // 🔹 4. Determine months in cycle
    const cycleMonths =
      billingCycle === "quarterly" ? 3 : billingCycle === "annual" ? 12 : 1;

    // 🔹 5. Calculate maintenance amount
    let maintenanceAmount = 0;
    if (charge.rateType === "per_sqft") {
      const unit = await Unit.findById(unitId);
      if (!unit?.areaSqFt) {
        return sendError(
          res,
          "Unit size (areaSqFt) not found for per_sqft calculation."
        );
      }
      maintenanceAmount = charge.rateValue * unit.areaSqFt * cycleMonths;
    } else {
      maintenanceAmount = charge.rateValue * cycleMonths;
    }

    // 🔹 6. Calculate GST and total
    const gstAmount = (maintenanceAmount * charge.gstPercent) / 100;
    const totalAmount = maintenanceAmount + gstAmount;

    // 🔹 7. Save new bill
    const newBill = new MaintenanceBill({
      landlordId,
      siteId,
      unitId,
      fromDate,
      toDate,
      maintenanceAmount: Number(maintenanceAmount.toFixed(2)),
      gstAmount: Number(gstAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      status: "Unpaid",
      generatedOn: new Date(),
    });

    await newBill.save();

    return sendSuccess(
      res,
      "✅ Maintenance bill generated successfully (previous bill replaced if existed)",
      newBill
    );
  } catch (error) {
    console.error("Generate Maintenance Bill Error:", error);
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
