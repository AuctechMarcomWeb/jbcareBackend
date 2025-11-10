import MaintainCharges from "../models/MantainCharge.modal.js";
import MaintenanceBill from "../models/MaintenanceBill.modal.js";
import Unit from "../models/masters/Unit.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";
import { generateMaintenanceBillCore } from "../services/maintenanceBillService.js";
import mongoose from "mongoose";
import User from "../models/User.modal.js";

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

export const getTodayMaintenanceForAll = async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const todayDateStr = now.toISOString().split("T")[0]; // yyyy-mm-dd

    // 🔹 Fetch all landlords
    const landlords = await User.find({ role: "landlord" }).select(
      "_id name email joiningDate siteId unitId createdAt"
    );

    if (!landlords.length) return sendError(res, "No landlords found", 404);

    const results = [];

    for (const landlord of landlords) {
      const {
        _id: landlordId,
        name,
        email,
        siteId,
        unitId,
        joiningDate,
        createdAt,
      } = landlord;

      if (!siteId || !unitId) continue;

      // ✅ Pick valid join date
      const rawJoinDate = joiningDate || createdAt;
      if (!rawJoinDate || isNaN(new Date(rawJoinDate))) {
        console.warn(
          `⚠️ Skipping landlord ${name} (${landlordId}) - Invalid join date:`,
          rawJoinDate
        );
        continue;
      }

      const joinDate = new Date(rawJoinDate);

      // 🔹 1️⃣ Fetch active maintenance charge
      const charge = await MaintainCharges.findOne({
        siteId,
        unitId,
        isActive: true,
      }).sort({ effectiveFrom: -1 });

      if (!charge) continue;

      // 🔹 2️⃣ Calculate total monthly charge
      let maintenanceAmount = 0;
      if (charge.rateType === "per_sqft") {
        const unit = await Unit.findById(unitId);
        if (!unit?.areaSqFt) continue;
        maintenanceAmount = charge.rateValue * unit.areaSqFt;
      } else {
        maintenanceAmount = charge.rateValue;
      }

      const gstAmount = (maintenanceAmount * charge.gstPercent) / 100;
      const totalMonthlyCharge = maintenanceAmount + gstAmount;
      const dailyCharge = totalMonthlyCharge / totalDaysInMonth;

      // 🔹 3️⃣ Determine bill period
      const fromDate = new Date(year, month, 1);
      const toDate = new Date(year, month + 1, 0, 23, 59, 59);

      // 🔹 4️⃣ Fetch or create the monthly bill
      let existingBill = await MaintenanceBill.findOne({
        landlordId,
        siteId,
        unitId,
        fromDate,
        toDate,
      });

      // 🔹 Prevent double addition in same day
      if (existingBill && existingBill.lastUpdatedDate === todayDateStr) {
        console.log(`⏩ Already updated today for landlord: ${name}`);
        continue;
      }

      // 🔹 If no bill exists yet → create new one
      if (!existingBill) {
        existingBill = new MaintenanceBill({
          landlordId,
          siteId,
          unitId,
          fromDate,
          toDate,
          maintenanceAmount: Number(maintenanceAmount.toFixed(2)),
          gstAmount: Number(gstAmount.toFixed(2)),
          totalAmount: Number(totalMonthlyCharge.toFixed(2)),
          billingAmount: 0, // will start from zero
          status: "Unpaid",
          generatedOn: now,
          lastUpdatedDate: todayDateStr,
        });
      }

      // 🔹 Add today’s daily charge
      existingBill.billingAmount = Number(
        (existingBill.billingAmount + dailyCharge).toFixed(2)
      );
      existingBill.generatedOn = now;
      existingBill.lastUpdatedDate = todayDateStr;

      await existingBill.save();

      // 🔹 Push result summary
      results.push({
        landlordId,
        name,
        email,
        siteId,
        unitId,
        month: `${year}-${String(month + 1).padStart(2, "0")}`,
        joiningDate: joinDate.toISOString().split("T")[0],
        totalMonthlyCharge: parseFloat(totalMonthlyCharge.toFixed(2)),
        dailyCharge: parseFloat(dailyCharge.toFixed(2)),
        billingAmount: parseFloat(existingBill.billingAmount.toFixed(2)),
        lastUpdatedDate: todayDateStr,
        asOfDate: now.toISOString().split("T")[0],
        dbRef: existingBill._id,
      });
    }

    // Sort results
    landlords.sort((a, b) =>
      a.siteId?.toString().localeCompare(b.siteId?.toString())
    );

    return sendSuccess(
      res,
      "✅ Daily maintenance updated successfully for all landlords",
      results,
      200
    );
  } catch (error) {
    console.error("Get Today Maintenance (All) Error:", error);
    return sendError(
      res,
      "❌ Failed to calculate/save today's maintenance for all landlords",
      500,
      error.message
    );
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

    // ✅ Convert string IDs to ObjectId if provided
    if (siteId) filters.siteId = new mongoose.Types.ObjectId(siteId);
    if (unitId) filters.unitId = new mongoose.Types.ObjectId(unitId);
    if (landlordId)
      filters.landlordId = new mongoose.Types.ObjectId(landlordId);
    if (status) filters.status = status;

    // ✅ Date handling: make fromDate start-of-day and toDate end-of-day
    let from = null;
    let to = null;
    if (fromDate) {
      from = new Date(fromDate);
      if (isNaN(from.getTime())) {
        return sendError(
          res,
          "Invalid fromDate format. Use YYYY-MM-DD or ISO string."
        );
      }
      from.setHours(0, 0, 0, 0);
    }
    if (toDate) {
      to = new Date(toDate);
      if (isNaN(to.getTime())) {
        return sendError(
          res,
          "Invalid toDate format. Use YYYY-MM-DD or ISO string."
        );
      }
      to.setHours(23, 59, 59, 999);
    }

    // If either provided, build generatedOn filter
    if (from || to) {
      filters.generatedOn = {};
      if (from) filters.generatedOn.$gte = from;
      if (to) filters.generatedOn.$lte = to;
    }

    const searchRegex = new RegExp(search, "i");
    const sortOrder = order === "asc" ? 1 : -1;
    const sortOptions = { [sortBy]: sortOrder };

    const pipeline = [
      // If generatedOn in DB is stored as a string (ISO), you can convert it to Date:
      // Uncomment the next stage if you store generatedOn as string. Otherwise leave commented.
      // {
      //   $addFields: {
      //     generatedOnAsDate: { $toDate: "$generatedOn" } // requires MongoDB 4.0+ and valid ISO strings
      //   }
      // },
      // { $match: filters } // If you used $addFields, use generatedOnAsDate in filters instead

      // If generatedOn is a Date in DB, simple $match works:
      { $match: filters },

      // lookups
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
          let: { unitId: "$unitId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$unitId"] },
              },
            },
            {
              $project: {
                _id: 1,
                unitNumber: 1,
                block: 1,
                floor: 1,
                status: 1,
                // 👇 exclude anything else
              },
            },
          ],
          as: "unit",
        },
      },
      {
        $unwind: {
          path: "$unit",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "users", // ✅ correct collection name
          let: { landlordId: "$landlordId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$landlordId"] },
                role: "landlord", // ✅ ensures we only get landlords
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                phone: 1,
                email: 1,
                joiningDate: 1, // make sure the field matches your schema
              },
            },
          ],
          as: "landlord",
        },
      },
      {
        $unwind: { path: "$landlord", preserveNullAndEmptyArrays: true },
      },
    ];

    // search after lookups (only when provided)
    if (search && search.trim() !== "") {
      pipeline.push({
        $match: {
          $or: [
            { "site.siteName": { $regex: searchRegex } },
            { "unit.unitNumber": { $regex: searchRegex } },
            { "landlord.name": { $regex: searchRegex } },
            { billNumber: { $regex: searchRegex } },
            { status: { $regex: searchRegex } },
          ],
        },
      });
    }

    pipeline.push({ $sort: sortOptions });

    if (isPagination === "true") {
      const skip = (Number(page) - 1) * Number(limit);
      pipeline.push({ $skip: skip }, { $limit: Number(limit) });
    }

    // Execute aggregation
    const data = await MaintenanceBill.aggregate(pipeline);

    // Count total: if search present we must count using aggregation so joined fields included
    let total = 0;
    if (search && search.trim() !== "") {
      // reuse pipeline but only up to match & count (remove pagination & sort)
      const countPipeline = pipeline.filter((stage) => {
        // remove $sort, $skip, $limit
        return !("$sort" in stage || "$skip" in stage || "$limit" in stage);
      });
      countPipeline.push({ $count: "count" });
      const countResult = await MaintenanceBill.aggregate(countPipeline);
      total = countResult[0]?.count || 0;
    } else {
      // no search — simple count with filters is enough
      total = await MaintenanceBill.countDocuments(filters);
    }

    return sendSuccess(res, "Maintenance bills fetched successfully", {
      data,
      total,
      currentPage: Number(page),
      totalPages: isPagination === "true" ? Math.ceil(total / limit) : 1,
    });
  } catch (error) {
    console.error("Get All Maintenance Bills Error:", error);
    return sendError(res, error.message);
  }
};

export const updateMaintenanceBill = async (req, res) => {
  try {
    const { billId } = req.params;
    const updateFields = req.body;

    // 🔹 Validate billId
    if (!billId) {
      return sendError(res, "Missing required parameter: billId");
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

export const getMaintenanceBillsByLandlord = async (req, res) => {
  try {
    const { id: landlordId, unitId } = req.params;
    const { search, fromDate, toDate, page = 1, limit = 10 } = req.query;

    console.log("🟢 Incoming Params =>", { landlordId, unitId });
    console.log("🟢 Query Params =>", {
      search,
      fromDate,
      toDate,
      page,
      limit,
    });

    // --------------------------------------------
    // 🧩 1️⃣ Build Filters
    // --------------------------------------------
    const filters = {};

    // landlordId (required)
    if (landlordId && mongoose.Types.ObjectId.isValid(landlordId)) {
      filters.landlordId = new mongoose.Types.ObjectId(landlordId);
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid landlordId" });
    }

    // unitId (optional)
    if (unitId && mongoose.Types.ObjectId.isValid(unitId)) {
      filters.unitId = new mongoose.Types.ObjectId(unitId);
    }

    // search filter (billTitle, projectName)
    if (search && search.trim() !== "") {
      filters.$or = [
        { billTitle: { $regex: search.trim(), $options: "i" } },
        { projectName: { $regex: search.trim(), $options: "i" } },
      ];
    }

    // --------------------------------------------
    // 🗓️ 2️⃣ Date Filters (using generatedOn instead of createdAt)
    // --------------------------------------------
    if (fromDate || toDate) {
      const generatedOnFilter = {};

      if (fromDate) {
        const parsedFrom = new Date(fromDate);
        if (!isNaN(parsedFrom)) {
          parsedFrom.setHours(0, 0, 0, 0);
          generatedOnFilter.$gte = parsedFrom;
        }
      }

      if (toDate) {
        const parsedTo = new Date(toDate);
        if (!isNaN(parsedTo)) {
          parsedTo.setHours(23, 59, 59, 999);
          generatedOnFilter.$lte = parsedTo;
        }
      }

      if (Object.keys(generatedOnFilter).length > 0) {
        filters.generatedOn = generatedOnFilter;
      }
    }

    console.log(
      "🧩 Final MongoDB Filters =>",
      JSON.stringify(filters, null, 2)
    );

    // --------------------------------------------
    // 📄 3️⃣ Pagination + Query
    // --------------------------------------------
    const p = Math.max(1, Number(page));
    const lim = Math.max(1, Number(limit));
    const skip = (p - 1) * lim;

    const [bills, total] = await Promise.all([
      MaintenanceBill.find(filters)
        .populate("siteId")
        .populate("unitId")
        .populate("landlordId")
        .sort({ generatedOn: -1 })
        .skip(skip)
        .limit(lim),
      MaintenanceBill.countDocuments(filters),
    ]);

    // --------------------------------------------
    // ✅ 4️⃣ Response
    // --------------------------------------------
    return res.status(200).json({
      success: true,
      message: "Maintenance bills fetched successfully",
      total,
      count: bills.length,
      page: p,
      limit: lim,
      filters,
      data: bills,
    });
  } catch (err) {
    console.error("❌ getMaintenanceBillsByLandlord Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

// ==================================================

export const deleteMaintenanceBill = async (req, res) => {
  try {
    const { id } = req.params;

    // 🧩 1️⃣ Validate id
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Bill ID is required",
      });
    }

    // 🧹 2️⃣ Find and delete
    const deletedBill = await MaintenanceBill.findByIdAndDelete(id);

    if (!deletedBill) {
      return res.status(404).json({
        success: false,
        message: "Maintenance bill not found",
      });
    }

    // ✅ 3️⃣ Success response
    return res.status(200).json({
      success: true,
      message: "Maintenance bill deleted successfully",
      data: deletedBill,
    });
  } catch (error) {
    console.error("❌ deleteMaintenanceBill Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const createMaintenanceBill = async (req, res) => {
  try {
    const {
      landlordId,
      siteId,
      unitId,
      fromDate,
      toDate,
      maintenanceAmount = 0,
      electricityAmount = 0,
    } = req.body;

    // --------------------------------------------
    // 🧩 1️⃣ Validation
    // --------------------------------------------
    if (!landlordId || !siteId || !unitId || !fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: landlordId, siteId, unitId, fromDate, toDate",
      });
    }

    // --------------------------------------------
    // 🧮 2️⃣ Calculate totals (with 18% GST)
    // --------------------------------------------
    const gstPercent = 18;
    const gstAmount = (maintenanceAmount * gstPercent) / 100;

    const totalAmount =
      Number(maintenanceAmount) + Number(electricityAmount) + Number(gstAmount);

    // --------------------------------------------
    // 🧾 3️⃣ Create and save new maintenance bill
    // --------------------------------------------
    const newBill = await MaintenanceBill.create({
      landlordId,
      siteId,
      unitId,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      maintenanceAmount,
      electricityAmount,
      gstAmount,
      totalAmount,
      billingAmount: totalAmount,
      lastUpdatedDate: new Date().toISOString(),
      status: "Unpaid",
      paymentStatus: "Pending",
    });

    // --------------------------------------------
    // ✅ 4️⃣ Response
    // --------------------------------------------
    return res.status(201).json({
      success: true,
      message: "Maintenance bill created successfully",
      data: newBill,
      calculation: {
        gstPercent,
        gstAmount,
        totalAmount,
      },
    });
  } catch (error) {
    console.error("❌ createMaintenanceBill Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// export const getAllMaintenanceBills1 = async (req, res) => {
//   try {
//     const {
//       search = "",
//       page = 1,
//       limit = 10,
//       landlordId,
//       fromDate,
//       toDate,
//     } = req.query;

//     // --------------------------------------------
//     // 🧩 1️⃣ Pagination setup
//     // --------------------------------------------
//     const p = Math.max(1, Number(page));
//     const lim = Math.max(1, Number(limit));
//     const skip = (p - 1) * lim;

//     // --------------------------------------------
//     // 🔍 2️⃣ Build filters
//     // --------------------------------------------
//     const filters = {};

//     // ✅ landlord filter
//     if (landlordId && mongoose.Types.ObjectId.isValid(landlordId)) {
//       filters.landlordId = landlordId;
//     }

//     // ✅ fromDate & toDate filter (based on Bill’s fromDate/toDate)
//     if (fromDate || toDate) {
//       filters.$and = [];

//       if (fromDate) {
//         const parsedFrom = new Date(fromDate);
//         if (!isNaN(parsedFrom)) {
//           filters.$and.push({ toDate: { $gte: parsedFrom } });
//         }
//       }

//       if (toDate) {
//         const parsedTo = new Date(toDate);
//         if (!isNaN(parsedTo)) {
//           filters.$and.push({ fromDate: { $lte: parsedTo } });
//         }
//       }

//       // remove $and if empty
//       if (filters.$and.length === 0) delete filters.$and;
//     }

//     // --------------------------------------------
//     // 📄 3️⃣ Query with populate
//     // --------------------------------------------
//     const query = MaintenanceBill.find(filters)
//       .populate("landlordId")
//       .populate("siteId")
//       .populate("unitId")
//       .sort({ fromDate: -1 });

//     let bills = await query;

//     // --------------------------------------------
//     // 🔍 4️⃣ Client-side search (for populated fields)
//     // --------------------------------------------
//     if (search.trim() !== "") {
//       const regex = new RegExp(search, "i");
//       bills = bills.filter(
//         (bill) =>
//           regex.test(bill?.landlordId?.name || "") ||
//           regex.test(bill?.siteId?.siteName || "") ||
//           regex.test(bill?.unitId?.unitName || "")
//       );
//     }

//     // --------------------------------------------
//     // 📑 5️⃣ Pagination
//     // --------------------------------------------
//     const total = bills.length;
//     const paginatedBills = bills.slice(skip, skip + lim);

//     // --------------------------------------------
//     // ✅ 6️⃣ Response
//     // --------------------------------------------
//     return res.status(200).json({
//       success: true,
//       message: "Maintenance bills fetched successfully",
//       total,
//       count: paginatedBills.length,
//       page: p,
//       limit: lim,
//       filters,
//       data: paginatedBills,
//     });
//   } catch (error) {
//     console.error("❌ getAllMaintenanceBills Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server Error",
//       error: error.message,
//     });
//   }
// };

export const getAllMaintenanceBills1 = async (req, res) => {
  try {
    const {
      search = "",
      page = 1,
      limit = 10,
      landlordId,
      fromDate,
      toDate,
    } = req.query;

    // --------------------------------------------
    // Pagination
    // --------------------------------------------
    const p = Math.max(1, Number(page));
    const lim = Math.max(1, Number(limit));
    const skip = (p - 1) * lim;

    // --------------------------------------------
    // Build filters
    // --------------------------------------------
    const filters = {};

    // landlord filter
    if (landlordId && mongoose.Types.ObjectId.isValid(landlordId)) {
      filters.landlordId = new mongoose.Types.ObjectId(landlordId);
    }

    // date-range filter based on bill.fromDate / bill.toDate overlap:
    // include bills whose toDate >= parsedFrom AND fromDate <= parsedTo
    if (fromDate || toDate) {
      const andClauses = [];
      if (fromDate) {
        const parsedFrom = new Date(fromDate);
        if (!isNaN(parsedFrom)) {
          andClauses.push({ toDate: { $gte: parsedFrom } });
        }
      }
      if (toDate) {
        const parsedTo = new Date(toDate);
        if (!isNaN(parsedTo)) {
          andClauses.push({ fromDate: { $lte: parsedTo } });
        }
      }
      if (andClauses.length > 0) {
        filters.$and = andClauses;
      }
    }

    // --------------------------------------------
    // Query and populate
    // --------------------------------------------
    let bills = await MaintenanceBill.find(filters)
      .populate("landlordId")
      .populate("siteId")
      .populate("unitId")
      .sort({ fromDate: -1 });

    // Client-side search for populated fields (landlord.name, site.siteName, unit.unitName)
    if (search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      bills = bills.filter(
        (bill) =>
          regex.test(bill?.landlordId?.name || "") ||
          regex.test(bill?.siteId?.siteName || "") ||
          regex.test(bill?.unitId?.unitNumber || "") ||
          regex.test(bill?.unitId?.unitName || "")
      );
    }

    // Pagination of the filtered list
    const total = bills.length;
    const paginatedBills = bills.slice(skip, skip + lim);

    // --------------------------------------------
    // Summary calculations (efficient where possible)
    // --------------------------------------------

    // 1) If landlordId given, compute overall previous totals for that landlord (all-time)
    let previousCount = 0;
    let unpaidCount = 0;
    let unpaidTotalAmount = 0;

    if (landlordId && mongoose.Types.ObjectId.isValid(landlordId)) {
      const landlordObjectId = new mongoose.Types.ObjectId(landlordId);

      // total number of bills for landlord
      previousCount = await MaintenanceBill.countDocuments({
        landlordId: landlordObjectId,
      });

      // aggregate unpaid count and unpaid sum for landlord
      const agg = await MaintenanceBill.aggregate([
        { $match: { landlordId: landlordObjectId, status: "Unpaid" } },
        {
          $group: {
            _id: null,
            unpaidCount: { $sum: 1 },
            unpaidTotal: {
              $sum: {
                $ifNull: ["$billingAmount", "$totalAmount", 0],
              },
            },
          },
        },
      ]);

      if (agg.length > 0) {
        unpaidCount = agg[0].unpaidCount || 0;
        unpaidTotalAmount = agg[0].unpaidTotal || 0;
      }
    }

    // 2) For the current filtered result set, compute unpaid counts/sums (skip paid)
    // Use the already fetched `bills` array (populated); compute from that
    let unpaidCountInFilter = 0;
    let unpaidTotalInFilter = 0;

    for (const bill of bills) {
      if (bill.status === "Unpaid") {
        unpaidCountInFilter += 1;
        unpaidTotalInFilter += Number(
          bill.billingAmount ?? bill.totalAmount ?? 0
        );
      }
    }

    // --------------------------------------------
    // Final response
    // --------------------------------------------
    return res.status(200).json({
      success: true,
      message: "Maintenance bills fetched successfully",
      total,
      count: paginatedBills.length,
      page: p,
      limit: lim,
      filters,
      summary: {
        previousCount,
        unpaidCount, // all-time unpaid for landlord
        unpaidTotalAmount, // all-time unpaid sum for landlord
        unpaidCountInFilter, // unpaid count within applied filters
        unpaidTotalInFilter, // unpaid sum within applied filters
      },
      data: paginatedBills,
    });
  } catch (error) {
    console.error("❌ getAllMaintenanceBills1 Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
