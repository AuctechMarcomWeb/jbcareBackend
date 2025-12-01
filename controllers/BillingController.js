import mongoose from "mongoose";
import Billing from "../models/Billing.modal.js";

import Landlord from "../models/LandLord.modal.js";

import MaintainCharges from "../models/MantainCharge.modal.js";
import Unit from "../models/masters/Unit.modal.js";
import Tenant from "../models/Tenant.modal.js";
import MeterLogs from "../models/MeterLogs.modal.js";
import Ledger from "../models/Ledger.modal.js";
import { createLedger } from "./ledgerController.js";
// import { createLedgerEntry, getOpening } from "./ledgerController.js";

export const createBilling = async (req, res) => {
  try {
    const bill = await Billing.create(req.body);

    // ⭐ Call ledger controller internally
    await createLedger(
      {
        body: {
          landlordId: bill.landlordId,
          siteId: bill.siteId,
          unitId: bill.unitId,
          billId: bill._id,
          type: "DEBIT",
          amount: bill.totalAmount,
          purpose: "Bill Generated",
          transactionType: "Bill",
        },
      },
      {
        status: () => ({ json: () => {} }), // dummy res object
      }
    );

    return res.status(201).json({
      success: true,
      message: "Billing record created successfully",
      data: bill,
    });
  } catch (error) {
    console.error("❌ createBilling Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// 🔵 GET ALL BILLS (with pagination, filters)
export const getAllBillings = async (req, res) => {
  try {
    const { landlordId, status, page = 1, limit = 10 } = req.query;

    const filters = {};
    if (landlordId && mongoose.Types.ObjectId.isValid(landlordId)) {
      filters.landlordId = landlordId;
    }
    if (status) filters.status = status;

    const p = Math.max(1, Number(page));
    const lim = Math.max(1, Number(limit));
    const skip = (p - 1) * lim;

    const total = await Billing.countDocuments(filters);
    const bills = await Billing.find(filters)
      .populate("landlordId siteId unitId")
      .sort({ fromDate: -1 })
      .skip(skip)
      .limit(lim);

    return res.status(200).json({
      success: true,
      message: "Billing records fetched successfully",
      total,
      count: bills.length,
      page: p,
      limit: lim,
      data: bills,
    });
  } catch (error) {
    console.error("❌ getAllBillings Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// 🟣 GET SINGLE BILL BY ID
export const getBillingById = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Billing.findById(id).populate(
      "landlordId siteId unitId"
    );

    if (!bill) {
      return res
        .status(404)
        .json({ success: false, message: "Billing record not found" });
    }

    return res.status(200).json({ success: true, data: bill });
  } catch (error) {
    console.error("❌ getBillingById Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// 🟠 UPDATE BILL
export const updateBilling = async (req, res) => {
  try {
    const { id } = req.params;
    // Fetch old bill before update
    const oldBill = await Billing.findById(id);
    if (!oldBill) {
      return res.status(404).json({
        success: false,
        message: "Billing record not found",
      });
    }

    // Update the bill
    const updatedBill = await Billing.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    // 👉 Check if status changed to "paid"
    if (req.body.status?.toLowerCase() === "paid") {
      const landlordId = updatedBill.landlordId;
      const billAmount = updatedBill.totalAmount;

      // Get last ledger closing balance
      const lastLedger = await Ledger.findOne({ landlordId }).sort({
        createdAt: -1,
      });

      const opening = lastLedger ? lastLedger.closingBalance : 0;
      const closing = opening - billAmount;

      // Create new ledger entry
      await Ledger.create({
        landlordId,
        billId: updatedBill._id,
        type: "CREDIT", // paying a bill deducts money
        amount: billAmount,
        openingBalance: opening,
        closingBalance: closing,
        remark: `Bill #${updatedBill._id} marked as paid`,
      });
    }

    if (!updatedBill) {
      return res
        .status(404)
        .json({ success: false, message: "Billing record not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Billing record updated successfully",
      data: updatedBill,
    });
  } catch (error) {
    console.error("❌ updateBilling Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// 🔴 DELETE BILL
export const deleteBilling = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBill = await Billing.findByIdAndDelete(id);

    if (!deletedBill) {
      return res
        .status(404)
        .json({ success: false, message: "Billing record not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Billing record deleted successfully",
    });
  } catch (error) {
    console.error("❌ deleteBilling Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// ⚫ DELETE ALL (optional)
export const deleteAllBillings = async (req, res) => {
  try {
    const result = await Billing.deleteMany({});
    return res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} billing record(s)`,
    });
  } catch (error) {
    console.error("❌ deleteAllBillings Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

export const getAllLandlordsBillingSummary = async (req, res) => {
  try {
    const {
      landlordId,
      siteId,
      unitId,
      search = "",
      page = 1,
      limit = 10,
      isPagination = "true",
    } = req.query;
    console.log("isPagination", isPagination);

    const now = new Date();
    const firstDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();

    const landlordFilter = { isActive: true };
    if (landlordId) landlordFilter._id = landlordId;

    const searchRegex = new RegExp(search, "i");

    const landlords = await Landlord.find(landlordFilter)
      .populate({
        path: "unitIds",
        populate: [
          { path: "siteId", select: "siteName" },
          { path: "tenantId", select: "name isActive" }, // <-- important
        ],
      })
      .lean();

    if (!landlords.length) {
      return res.status(404).json({
        success: false,
        message: "No landlords found",
        data: [],
      });
    }

    const summary = [];

    for (const landlord of landlords) {
      if (search && !landlord.name.match(searchRegex)) {
        const unitMatch = landlord.unitIds.some(
          (u) =>
            u?.unitNumber?.match(searchRegex) ||
            u?.siteId?.siteName?.match(searchRegex)
        );
        if (!unitMatch) continue;
      }

      let totalMaintenance = 0;
      let totalGST = 0;
      let totalBill = 0;
      let totalElectricityAmount = 0;
      let totalAmount = 0;

      const unitDetails = [];

      const filteredUnits = landlord.unitIds.filter((unit) => {
        if (siteId && String(unit.siteId?._id) !== String(siteId)) return false;
        if (unitId && String(unit._id) !== String(unitId)) return false;
        return true;
      });

      for (const unit of filteredUnits) {
        const maintainCharge = await MaintainCharges.findOne({
          siteId: unit.siteId?._id,
          unitId: unit._id,
          isActive: true,
        });

        let maintenance = 0;
        let maintenancePerSqft = 0;
        let gst = 0;

        if (maintainCharge) {
          if (maintainCharge.rateType === "per_sqft") {
            maintenancePerSqft = maintainCharge.rateValue || 0;
            maintenance = (unit.areaSqFt || 0) * maintenancePerSqft;
          } else {
            maintenance = maintainCharge.rateValue || 0;
          }
          gst = (maintenance * (maintainCharge.gstPercent || 0)) / 100;
        } else {
          maintenance = 100;
          gst = (maintenance * 18) / 100;
        }

        // ---- Dummy Electricity Data ----
        const electricityUnitRate = 10;
        const electricityUnitsUsed = 50;
        const electricityTotalAmount =
          electricityUnitRate * electricityUnitsUsed;

        totalMaintenance += maintenance;
        totalGST += gst;
        totalBill += maintenance + gst;
        totalElectricityAmount += electricityTotalAmount;
        totalAmount += maintenance + gst + electricityTotalAmount;

        let billTo = "landlord";
        let hasActiveTenant = "No";
        let landlordStaying = "Yes";
        let tenant = "";

        // Check if tenant exists in unit
        if (unit.tenantId) {
          hasActiveTenant = "Yes";
          landlordStaying = "No";

          // Fetch the tenant history record that isActive: true
          const activeTenantRecord = unit.tenantHistory?.find(
            (t) => t.isActive
          );

          tenant = await Tenant.findById(activeTenantRecord?.tenantId)
            .select("name email phone ")
            .lean();

          if (activeTenantRecord?.billTo) {
            billTo = activeTenantRecord.billTo; // "tenant" or "landlord"
          } else {
            billTo = "tenant"; // default fallback if tenant exists
          }
        }

        unitDetails.push({
          unitArea: unit.areaSqFt || 0,

          hasActiveTenant,
          landlordStaying,
          billTo,
          tenant,
          maintenanceRateType: maintainCharge?.rateType || "flat",
          maintenanceRateValue: maintainCharge?.rateValue || 0,
          maintenancePerSqft: maintenancePerSqft,
          // maintenanceTotal: maintenance.toFixed(2),

          electricityUnitRate,
          electricityUnitsUsed,
          // electricityTotalAmount,

          // gst: gst.toFixed(2),
          totalUnitBill: (maintenance + gst + electricityTotalAmount).toFixed(
            2
          ),
        });
      }

      // ---- Bill Stats ----
      const allBills = await Billing.find({ landlordId: landlord._id })
        .populate("unitId siteId")
        .lean();

      const searchedBills = search
        ? allBills.filter(
            (b) =>
              b?.siteId?.siteName?.match(searchRegex) ||
              b?.unitId?.unitNumber?.match(searchRegex) ||
              (b?.status || "").match(searchRegex)
          )
        : allBills;

      const paidBills = searchedBills.filter((b) => b.status === "Paid");
      const unpaidBills = searchedBills.filter((b) => b.status === "Unpaid");

      const paidBillTotal = paidBills.reduce(
        (sum, bill) => sum + (bill.totalAmount || 0),
        0
      );
      const previousUnpaidBill = unpaidBills.reduce(
        (sum, bill) => sum + (bill.totalAmount || 0),
        0
      );

      const perDayMaintenance = totalAmount / daysInMonth;
      const activeDays =
        Math.floor((now - firstDay) / (1000 * 60 * 60 * 24)) + 1;
      const billingTillToday = activeDays * perDayMaintenance;

      const siteNames = filteredUnits
        .map((u) => u?.siteId?.siteName)
        .filter(Boolean)
        .join(", ");

      const unitNumbers = filteredUnits
        .map((u) => u?.unitNumber)
        .filter(Boolean)
        .join(", ");

      const meterLog = await MeterLogs.findOne({ landlordId: landlord._id })
        .select("currentStatus")
        .lean();

      const meterId = await MeterLogs.findOne({ landlordId: landlord._id })
        .select("meterId")
        .lean();
      const customerId = await MeterLogs.findOne({ landlordId: landlord._id })
        .select("customerId")
        .lean();
      const meterSN = await MeterLogs.findOne({ landlordId: landlord._id })
        .select("meterSerialNumber")
        .lean();

      summary.push({
        landlordId: landlord._id,
        landlordName: landlord.name,

        siteNames,
        unitNumbers,
        totalMaintenance: totalMaintenance.toFixed(2),
        totalGST: totalGST.toFixed(2),
        electricityAmount: totalElectricityAmount.toFixed(2),
        totalBillingAmount: totalAmount.toFixed(2),

        perDayMaintenance: perDayMaintenance.toFixed(2),
        monthDays: daysInMonth,
        billingTillToday: billingTillToday.toFixed(2),

        previousUnpaidBill: previousUnpaidBill.toFixed(2),
        paidCount: paidBills.length,
        unpaidCount: unpaidBills.length,
        paidBillTotal: paidBillTotal.toFixed(2),

        unitDetails, // ⬅️ FULL UNIT DATA

        // ✅ Add current meter status here
        meterStatus: meterLog?.currentStatus || "ON",
        meterId: meterId?.meterId,
        customerId: customerId?.customerId,
        meterSN: meterSN?.meterSerialNumber,

        fromDate: firstDay,
        toDate: now,
      });
    }

    // ---- Pagination (Applied only when isPagination=true) ----
    // let isPagination = req.query.isPagination || "true";
    let paginatedData = summary;

    if (isPagination === "true") {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;

      paginatedData = summary.slice(startIndex, endIndex);

      return res.status(200).json({
        success: true,
        message: "Landlord billing summary fetched successfully",
        count: paginatedData.length,
        total: summary.length,
        page,
        limit,
        data: paginatedData,
      });
    }
    // ---- No Pagination ----
    return res.status(200).json({
      success: true,
      message: "Landlord billing summary fetched successfully",
      count: summary.length,
      total: summary.length,
      data: summary,
    });
  } catch (error) {
    console.error("❌ getAllLandlordsBillingSummary Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const generateMonthlyBills = async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const fromDate = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0));
    const toDate = new Date(
      Date.UTC(currentYear, currentMonth, daysInMonth, 23, 59, 59)
    );

    const landlords = await Landlord.find({ isActive: true }).populate(
      "unitIds"
    );

    if (!landlords.length) {
      return res
        .status(404)
        .json({ success: false, message: "No active landlords found." });
    }

    let summary = [];

    for (const landlord of landlords) {
      if (!landlord.unitIds || landlord.unitIds.length === 0) continue;

      const landlordSummary = {
        landlordId: landlord._id,
        landlordName: landlord.name,
        totalMaintenance: 0,
        totalElectricity: 0,
        totalGST: 0,
        totalBillingAmount: 0,
        perDayMaintenance: 0,
        monthDays: daysInMonth,
        billingTillToday: 0,
        previousUnpaidBill: 0,
        paidCount: 0,
        unpaidCount: 0,
        fromDate,
        toDate: now,
      };

      // ✅ 1. Get previous unpaid bills
      const previousUnpaid = await Billing.find({
        landlordId: landlord._id,
        status: "Unpaid",
        toDate: { $lt: fromDate },
      });

      landlordSummary.previousUnpaidBill = previousUnpaid.reduce(
        (sum, b) => sum + Number(b.totalAmount || 0),
        0
      );

      // ✅ 2. Loop units
      for (const unitId of landlord.unitIds) {
        const unit = await Unit.findById(unitId);
        if (!unit) {
          console.log(`⚠️ Unit not found for ID ${unitId}`);
          continue;
        }

        const siteId = unit.siteId;
        const maintainCharge = await MaintainCharges.findOne({
          siteId,
          unitId: unit._id,
          isActive: true,
        });

        if (!maintainCharge) {
          console.log(
            `⚠️ No active maintainCharge found for unit ${unit.unitNumber}`
          );
          continue;
        }

        console.log(
          `✅ Found maintainCharge for ${unit.unitNumber}:`,
          maintainCharge.rateValue
        );

        // ✅ Convert to numbers safely
        const rateValue = Number(maintainCharge.rateValue || 0);
        const gstPercent = Number(maintainCharge.gstPercent || 0);
        const area = Number(unit.areaSqFt || 0);

        // ✅ Calculate maintenance
        let maintenance = 0;
        if (maintainCharge.rateType === "per_sqft") {
          maintenance = area * rateValue;
        } else {
          maintenance = rateValue;
        }

        // ✅ GST & total
        const gstAmount = (maintenance * gstPercent) / 100;
        const electricity = 1; // you can replace this later
        const totalAmount = maintenance + gstAmount + electricity;

        // ✅ Check existing bill
        const existingBill = await Billing.findOne({
          landlordId: landlord._id,
          unitId: unit._id,
          fromDate: { $gte: fromDate, $lte: toDate },
        });
        console.log("DEBUG → existingBill:", existingBill);
        console.log("DEBUG → previousBills:", previousUnpaid);

        if (!existingBill) {
          // 1️⃣ Create new bill
          const newBill = await Billing.create({
            landlordId: landlord._id,
            siteId,
            unitId: unit._id,
            fromDate,
            toDate,
            maintenanceAmount: maintenance.toFixed(2),
            electricityAmount: electricity.toFixed(2),
            gstAmount: gstAmount.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
            status: "Unpaid",
          });

          console.log("📌 New Bill Created:", newBill._id);

          // 2️⃣ Get last ledger entry for this landlord
          const lastLedger = await Ledger.findOne({
            landlordId: landlord._id,
          }).sort({ createdAt: -1 });

          const openingBalance = lastLedger
            ? Number(lastLedger.closingBalance)
            : 0;

          // 3️⃣ Closing balance increases because bill is CREDIT (landlord needs to pay)
          const closingBalance = openingBalance + Number(newBill.totalAmount);

          // 🛑 Check if ledger already created for this bill
          const existingLedger = await Ledger.findOne({
            landlordId: landlord._id,
            unitId: unit._id,
            billId: newBill._id,
          });
          if (existingLedger) {
            console.log("⚠️ Ledger already exists for this bill → Skipping");
            continue; // Skip ledger creation
          }

          // 4️⃣ Create ledger entry
          await Ledger.create({
            landlordId: landlord._id,
            billId: newBill._id,
            siteId: landlord.siteId,
            unitId: unit._id,
            type: "DEBIT", // Bill Generated = Credit
            amount: Number(newBill.totalAmount),
            openingBalance,
            closingBalance,
            narration: `Monthly bill generated for Unit ${unit.unitNumber}`,
          });

          console.log("📘 Ledger Created for Bill:", newBill._id);
        }

        landlordSummary.totalMaintenance += maintenance;
        landlordSummary.totalGST += gstAmount;
        landlordSummary.totalElectricity += electricity;
        landlordSummary.totalBillingAmount += totalAmount;
      }

      // ✅ Compute per day and till today billing
      landlordSummary.perDayMaintenance = (
        landlordSummary.totalMaintenance / daysInMonth
      ).toFixed(2);

      const today = now.getDate();
      landlordSummary.billingTillToday = (
        Number(landlordSummary.perDayMaintenance) * today
      ).toFixed(2);

      // ✅ Paid/unpaid counts
      const bills = await Billing.find({ landlordId: landlord._id });
      landlordSummary.paidCount = bills.filter(
        (b) => b?.status === "Paid"
      ).length;
      landlordSummary.unpaidCount = bills.filter(
        (b) => b?.status === "Unpaid"
      ).length;

      // ✅ Fix final formatting
      landlordSummary.totalMaintenance =
        landlordSummary.totalMaintenance.toFixed(2);
      landlordSummary.totalElectricity =
        landlordSummary.totalElectricity.toFixed(2);
      landlordSummary.totalGST = landlordSummary.totalGST.toFixed(2);
      landlordSummary.totalBillingAmount =
        landlordSummary.totalBillingAmount.toFixed(2);
      landlordSummary.previousUnpaidBill =
        landlordSummary.previousUnpaidBill.toFixed(2);

      summary.push(landlordSummary);
    }

    if (res) {
      return res.status(200).json({
        success: true,
        message: "Monthly bills generated successfully",
        count: summary.length,
        data: summary,
      });
    } else {
      console.log("✅ Monthly bills generated successfully", summary.length);
      return {
        success: true,
        count: summary.length,
        data: summary,
      };
    }
  } catch (error) {
    console.error("❌ generateMonthlyBills Error:", error);
    if (res) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate monthly bills",
        error: error.message,
      });
    } else {
      return { success: false, message: "Failed", error: error.message };
    }
  }
};
