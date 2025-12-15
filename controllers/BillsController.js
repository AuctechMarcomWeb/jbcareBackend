import Bills from "../models/Bills.modal.js";
import MeterLogs from "../models/MeterLogs.modal.js";

import mongoose from "mongoose";
import { sendError, sendSuccess } from "../utils/responseHandler.js";
import Landlord from "../models/LandLord.modal.js";
import Tenant from "../models/Tenant.modal.js";
import Unit from "../models/masters/Unit.modal.js";
import MaintainCharges from "../models/MantainCharge.modal.js";
import FixElectricityCharges from "../models/masters/FixElectricityCharges.modal.js";
import electricityCharges from "../models/ElectricitychargesRate.modal.js";
import Site from "../models/masters/site.modal.js";
import PaymentLedger from "../models/paymentLedger.modal.js";
import axios from "axios";



export const createBillForAll1 = async (req, res) => {
  try {
    console.log("============== GENERATING MONTHLY BILLS ==============");

    // ===============================
    // 1️⃣ LAST MONTH DATE RANGE
    // ===============================
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const daysInLastMonth = new Date(lastMonthYear, lastMonth + 1, 0).getDate();

    const fromDate = new Date(Date.UTC(lastMonthYear, lastMonth, 1, 0, 0, 0));
    const toDate = new Date(
      Date.UTC(lastMonthYear, lastMonth, daysInLastMonth, 23, 59, 59)
    );

    // ===============================
    // 2️⃣ GET ALL ACTIVE LANDLORDS
    // ===============================
    const landlords = await Landlord.find({ isActive: true }).populate("unitIds");

    if (!landlords.length) {
      return sendError(res, "No active landlords found");
    }

    const generatedBills = [];

    console.log("Total Landlords Found:", landlords.length);

    // ===============================
    // 3️⃣ LOOP THROUGH LANDLORDS
    // ===============================
    for (const landlord of landlords) {
      console.log("\n----------------------------------------");
      console.log("Processing Landlord:", landlord._id);

      if (!landlord.unitIds || landlord.unitIds.length === 0) {
        console.log("⛔ SKIPPED: No units found");
        continue;
      }

      // ===============================
      // EACH UNIT
      // ===============================
      for (const unit of landlord.unitIds) {
        console.log("  → Processing Unit:", unit._id);

        // ===============================
        // 4️⃣ CHECK DUPLICATE BILL
        // ===============================
        const existingBill = await Bills.findOne({
          landlordId: landlord._id,
          siteId: unit.siteId,
          unitId: unit._id,
          fromDate,
          toDate,
        });

        if (existingBill) {
          console.log("  ⛔ SKIPPED (Duplicate Bill Exists)");
          continue;
        }

        // ===============================
        // 5️⃣ GET ELECTRICITY CHARGES
        // ===============================
        const charge = await electricityCharges.findOne({
          siteId: unit.siteId,
          unitId: unit._id,
          isActive: true,
        });

        let tariffRate = charge?.tariffGrid || 0;
        let dgTariff = charge?.dgTariff || 0;
        let surchargePercent = charge?.surchargePercent || 0;

        // ===============================
        // 6️⃣ GET ELECTRICITY API DATA
        // ===============================
        let previousReading = 0,
          currentReading = 0,
          mainUnits = 0,
          dgPreviousReading = 0,
          dgCurrentReading = 0,
          dgUnits = 0;

        if (landlord.customerId && landlord.meterSerialNumber) {
          try {
            const payload = {
              CustomerID: landlord.customerId,
              MeterSerialNumber: landlord.meterSerialNumber,
            };

            const energyRes = await axios.post(
              "http://103.245.34.54:9000/api/Dashboard/EnergyConsumption",
              payload
            );

            const energy = energyRes?.data?.Data;

            if (energy) {
              previousReading = energy.StartingMainReadingOfMonth || 0;
              currentReading = energy.ClosingMainsReadingOfMonth || 0;
              mainUnits = energy.sumEnergyMain || 0;
              dgPreviousReading = energy.StartDGReadingOfMonth || 0;
              dgCurrentReading = energy.ClosingDGReadingOfMonth || 0;
              dgUnits = energy.sumEnergyDG || 0;
            }
          } catch (err) {
            console.log("⚠ API ERROR — using 0 units");
          }
        }

        // ===============================
        // 7️⃣ ELECTRICITY CALCULATIONS
        // ===============================
        const mainAmount = mainUnits * tariffRate;
        const dgAmount = dgUnits * dgTariff;
        const surchargeAmount = ((mainAmount + dgAmount) * surchargePercent) / 100;

        const electricityTotal = mainAmount + dgAmount + surchargeAmount;

        // ===============================
        // 8️⃣ MAINTENANCE CHARGES
        // ===============================
        const maintain = await MaintainCharges.findOne({
          siteId: unit.siteId,
          unitId: unit._id,
          isActive: true,
        });

        let maintenanceAmount = 0;
        let maintenanceBreakup = null;

        if (maintain) {
          if (maintain.rateType === "per_sqft") {
            maintenanceAmount = maintain.rateValue * (unit.areaSqFt || 0);

            maintenanceBreakup = {
              rateType: "per_sqft",
              SqftRate: maintain.rateValue,
              SqftArea: unit.areaSqFt || 0,
              SqftAmount: maintenanceAmount,
              gstPercent: maintain.gstPercent,
              maintenanceAmount,
            };
          } else {
            maintenanceAmount = maintain.rateValue;

            maintenanceBreakup = {
              rateType: "fixed",
              fixedAmount: maintain.rateValue,
              gstPercent: maintain.gstPercent,
              maintenanceAmount,
            };
          }
        }

        // ===============================
        // 9️⃣ FINAL BILL AMOUNT
        // ===============================
        const totalAmount = electricityTotal + maintenanceAmount;

        // ===============================
        // 🔟 ELECTRICITY BREAKUP
        // ===============================
        const electricityBreakup = {
          previousReading,
          currentReading,
          consumedUnits: mainUnits,
          dgPreviousReading,
          dgCurrentReading,
          dgConsumedUnits: dgUnits,
          tariffRate,
          dgTariff,
          surchargePercent,
          electricityAmount: mainAmount,
          dgAmount,
          surchargeAmount,
        };


        const tenant = await Tenant.findOne({
          unitId: unit._id,
          landlordId: landlord._id,
          isActive: true,
        });

        let billTo = "landlord";
        let tenantId = null;

        if (tenant && tenant.billTo === "tenant") {
          billTo = "tenant";
          tenantId = tenant._id;
        }



        // ===============================
        // 1️⃣1️⃣ CREATE BILL
        // ===============================
        const newBill = await Bills.create({
          landlordId: landlord._id,
          siteId: unit.siteId,
          unitId: unit._id,
          tenantId: tenantId,
          billTo: billTo,
          fromDate,
          toDate,
          electricity: electricityBreakup,
          maintenance: maintenanceBreakup,
          totalAmount,
          lastUpdatedDate: new Date(),
          status: "Unpaid",
        });

        console.log("  ✔ Bill Created:", newBill._id);

        // ==========================================
        // 1️⃣2️⃣ CREATE LEDGER ENTRY (AUTO LIKE SINGLE BILL)
        // ==========================================
        const lastEntry = await PaymentLedger.findOne({
          landlordId: landlord._id,
          siteId: unit.siteId,
          unitId: unit._id,
        }).sort({ entryDate: -1 });

        const openingBalance = lastEntry ? lastEntry.closingBalance : 0;

        const entryType = "Debit";
        const debitAmount = totalAmount;
        const creditAmount = 0;

        const closingBalance = openingBalance - debitAmount;

        await PaymentLedger.create({
          landlordId: landlord._id,
          siteId: unit.siteId,
          unitId: unit._id,
          remark: "Bill Generated",
          description: "Monthly Bill Added",
          paymentMode: "Online",
          entryType,
          debitAmount,
          creditAmount,
          openingBalance,
          closingBalance,
          entryDate: new Date(),
        });

        // ==========================================
        generatedBills.push(newBill);
      }
    }

    return sendSuccess(
      res,
      generatedBills,
      "Bills & Ledger entries generated successfully for ALL landlords"
    );
  } catch (error) {
    console.log("❌ ERROR:", error);
    return sendError(res, `Error: ${error.message}`);
  }
};


export const createBillForAll = async (req, res) => {
  try {
    console.log("============== GENERATING MONTHLY BILLS ==============");

    // ===============================
    // 1️⃣ LAST MONTH DATE RANGE
    // ===============================
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const daysInLastMonth = new Date(lastMonthYear, lastMonth + 1, 0).getDate();

    console.log("daysInLastMonth", daysInLastMonth);



    const fromDate = new Date(Date.UTC(lastMonthYear, lastMonth, 1, 0, 0, 0));
    const toDate = new Date(
      Date.UTC(lastMonthYear, lastMonth, daysInLastMonth, 23, 59, 59)
    );

    // ===============================
    // 2️⃣ ACTIVE LANDLORDS
    // ===============================
    const landlords = await Landlord.find({ isActive: true }).populate("unitIds");

    if (!landlords.length) {
      return sendError(res, "No active landlords found");
    }

    const generatedBills = [];

    // ===============================
    // 3️⃣ LOOP LANDLORDS
    // ===============================
    for (const landlord of landlords) {
      if (!landlord.unitIds || !landlord.unitIds.length) continue;

      for (const unit of landlord.unitIds) {
        // ===============================
        // 4️⃣ DUPLICATE CHECK
        // ===============================
        const alreadyExists = await Bills.findOne({
          landlordId: landlord._id,
          siteId: unit.siteId,
          unitId: unit._id,
          fromDate,
          toDate,
        });

        if (alreadyExists) continue;

        // ===============================
        // 5️⃣ SITE & FIX ELECTRICITY CHARGES
        // ===============================
        const site = await Site.findById(unit.siteId);

        const fixCharge = await FixElectricityCharges.findOne({
          siteType: site.siteType,
          isActive: true,
        });

        const tariffRate = fixCharge?.tariffRate || 0;
        const dgTariff = fixCharge?.dgTariff || 0;
        const surchargePercent = fixCharge?.surchargePercent || 0;
        const load = unit?.load || 0;
        const fixmantance = fixCharge?.fixmantance || 0;
        const fixLoadcharges = fixCharge?.fixLoadcharges || 0;
        const fixmantanceAmount = fixmantance * load || 0;
        const fixLoadchargesAmount = fixLoadcharges * load * daysInLastMonth || 0;


        // ===============================
        // 6️⃣ ELECTRICITY API (UNIT BASED)
        // ===============================
        let previousReading = 0,
          currentReading = 0,
          mainUnits = 0,
          dgPreviousReading = 0,
          dgCurrentReading = 0,
          dgUnits = 0;

        if (unit.customerId && unit.meterSerialNumber) {
          try {
            const payload = {
              CustomerID: unit.customerId,
              MeterSerialNumber: unit.meterSerialNumber,
            };

            const energyRes = await axios.post(
              "http://103.245.34.54:9000/api/Dashboard/EnergyConsumption",
              payload
            );

            const energy = energyRes?.data?.Data;

            if (energy) {
              previousReading = energy.StartingMainReadingOfMonth || 0;
              currentReading = energy.ClosingMainsReadingOfMonth || 0;
              mainUnits = energy.sumEnergyMain || 0;

              dgPreviousReading = energy.StartDGReadingOfMonth || 0;
              dgCurrentReading = energy.ClosingDGReadingOfMonth || 0;
              dgUnits = energy.sumEnergyDG || 0;
            }
          } catch (err) {
            console.log("⚠ Electricity API failed, units set to 0");
          }
        }

        // ===============================
        // 7️⃣ ELECTRICITY CALCULATION
        // ===============================
        const mainAmount = mainUnits * tariffRate;
        const dgAmount = dgUnits * dgTariff;

        // 🔥 Surcharge ONLY on MAIN amount
        const surchargeAmount = (mainAmount * surchargePercent) / 100;

        const electricityTotal =
          mainAmount +
          dgAmount +
          fixLoadchargesAmount +
          fixmantanceAmount +
          surchargeAmount;

        const electricityBreakup = {
          previousReading,
          currentReading,
          consumedUnits: mainUnits,
          dgPreviousReading,
          dgCurrentReading,
          dgConsumedUnits: dgUnits,
          tariffRate,
          load,
          dgTariff,
          surchargePercent,
          fixLoadcharges,
          fixmantance,
          fixmantanceAmount,
          fixLoadchargesAmount,
          electricityAmount: mainAmount,
          dgAmount,
          surchargeAmount,
        };

        // ===============================
        // 8️⃣ MAINTENANCE (UNCHANGED)
        // ===============================
        const maintain = await MaintainCharges.findOne({
          siteId: unit.siteId,
          unitId: unit._id,
          isActive: true,
        });

        let maintenanceAmount = 0;
        let maintenanceBreakup = null;

        if (maintain) {
          let baseAmount =
            maintain.rateType === "per_sqft"
              ? (unit.areaSqFt || 0) * maintain.rateValue
              : maintain.rateValue;

          const gstAmount =
            (baseAmount * (maintain.gstPercent || 0)) / 100;

          maintenanceAmount = baseAmount + gstAmount;

          maintenanceBreakup = {
            rateType: maintain.rateType,
            fixedAmount: maintain.rateType === "fixed" ? maintain.rateValue : 0,
            SqftRate:
              maintain.rateType === "per_sqft" ? maintain.rateValue : 0,
            SqftArea:
              maintain.rateType === "per_sqft" ? unit.areaSqFt || 0 : 0,
            SqftAmount: baseAmount,
            gstPercent: maintain.gstPercent,
            maintenanceAmount,
          };
        }

        // ===============================
        // 9️⃣ TENANT CHECK
        // ===============================
        const tenant = await Tenant.findOne({
          unitId: unit._id,
          landlordId: landlord._id,
          isActive: true,
        });

        let billTo = "landlord";
        let tenantId = null;

        if (tenant && tenant.billTo === "tenant") {
          billTo = "tenant";
          tenantId = tenant._id;
        }

        // ===============================
        // 🔟 FINAL BILL
        // ===============================
        const totalAmount = electricityTotal + maintenanceAmount;

        const bill = await Bills.create({
          landlordId: landlord._id,
          siteId: unit.siteId,
          unitId: unit._id,
          tenantId,
          billTo,
          fromDate,
          toDate,
          electricity: electricityBreakup,
          maintenance: maintenanceBreakup,
          totalAmount,
          lastUpdatedDate: new Date(),
          status: "Unpaid",
        });

        // ===============================
        // 1️⃣1️⃣ PAYMENT LEDGER
        // ===============================
        const lastEntry = await PaymentLedger.findOne({
          landlordId: landlord._id,
          siteId: unit.siteId,
          unitId: unit._id,
        }).sort({ entryDate: -1 });

        const openingBalance = lastEntry ? lastEntry.closingBalance : 0;
        const closingBalance = openingBalance - totalAmount;

        await PaymentLedger.create({
          landlordId: landlord._id,
          siteId: unit.siteId,
          unitId: unit._id,
          remark: "Bill Generated",
          description: "Monthly Bill Added",
          entryType: "Debit",
          debitAmount: totalAmount,
          creditAmount: 0,
          openingBalance,
          closingBalance,
          entryDate: new Date(),
        });

        generatedBills.push(bill);
      }
    }

    return sendSuccess(
      res,
      generatedBills,
      "Bills & ledger generated successfully"
    );
  } catch (error) {
    console.error(error);
    return sendError(res, error.message);
  }
};

export const updateBillStatus = async (req, res) => {
  try {
    const { billId } = req.params;
    const { newStatus, remark } = req.body;

    if (!newStatus) {
      return sendError(res, "newStatus is required");
    }

    // Valid status list
    const validStatus = ["Unpaid", "Under Process", "Paid"];
    if (!validStatus.includes(newStatus)) {
      return sendError(res, "Invalid status value");
    }

    // Find bill
    const bill = await Bills.findById(billId);
    if (!bill) return sendError(res, "Bill not found");

    // Prevent duplicate status update
    if (bill.status === newStatus) {
      return sendError(res, `Bill is already in '${newStatus}' status`);
    }

    const oldStatus = bill.status;

    // Update main status
    bill.status = newStatus;
    bill.lastUpdatedDate = new Date().toISOString();

    // Push to statusLog
    bill.statusLog.push({
      oldStatus,
      newStatus,
      remark: remark || "",
      changedAt: new Date()
    });

    await bill.save();

    return sendSuccess(res, bill, "Bill status updated successfully");
  } catch (error) {
    console.error("Update Status Error:", error);
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


    const openingBalance = lastEntry ? lastEntry?.closingBalance : 0;


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
      paymentMode: "Online",
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
      tenantId,
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
    if (tenantId) filters.tenantId = tenantId;
    if (siteId) filters.siteId = siteId;
    if (unitId) filters.unitId = unitId;
    if (status) filters.status = status;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    // -----------------------------
    // ⭐ BILL PERIOD FILTER (fromDate + toDate)
    // -----------------------------
    if (fromDate && toDate) {
      // Ensure full-day filter till 23:59:59
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);

      filters.fromDate = { $gte: start };
      filters.toDate = { $lte: end };
    }
    // --------------------------------
    // FETCH BILLS
    // --------------------------------
    const bills = await Bills.find(filters)
      .populate("landlordId", "name meterSerialNumber meterId customerId")
      .populate("tenantId", "name")
      .populate("siteId", "siteName siteType")
      .populate("unitId", "unitNumber")
      .sort({ fromDate: -1 }) // 👈 sorted by billing period
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Bills.countDocuments(filters);

    // -------------------------------------------
    // ⭐ GET LATEST METER STATUS FOR EACH landlordId
    // -------------------------------------------
    const landlordIds = bills.map((b) => b.landlordId?._id);

    const meterLogs = await MeterLogs.find({
      landlordId: { $in: landlordIds },
    });

    // Map: landlordId → meterStatus
    const meterStatusMap = {};
    meterLogs.forEach((log) => {
      const lastAction = log.logs?.length
        ? log.logs[log.logs.length - 1].action
        : log.currentStatus || "ON";

      meterStatusMap[log.landlordId] = lastAction;
    });

    // Attach meterStatus to each bill
    const responseBills = bills.map((b) => ({
      ...b.toObject(),
      meterStatus:
        meterStatusMap[b.landlordId?._id] || "ON",
    }));




    return sendSuccess(res, "Bills fetched successfully", {
      data: responseBills,
      total,
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("Get Bills Error:", error);
    return sendError(res, error.message);
  }
};



export const getBillingSummary = async (req, res) => {
  try {
    const { landlordId, siteId, fromDate, toDate } = req.query;

    const filters = {};
    if (landlordId) filters.landlordId = landlordId;
    if (siteId) filters.siteId = siteId;

    // 1️⃣ Date Filters
    if (fromDate && toDate) {
      filters.$or = [
        { fromDate: { $gte: new Date(fromDate), $lte: new Date(toDate) } },
        { toDate: { $gte: new Date(fromDate), $lte: new Date(toDate) } },
        {
          $and: [
            { fromDate: { $lte: new Date(fromDate) } },
            { toDate: { $gte: new Date(toDate) } }
          ]
        }
      ];
    }

    // 2️⃣ Fetch Bills
    const bills = await Bills.find(filters).lean();

    let maintenanceTotal = 0;
    let maintenanceCollected = 0;

    let electricityTotal = 0;
    let electricityCollected = 0;

    bills.forEach(bill => {

      // -------------------------------------------------
      // -------------- Maintenance Calculation ----------
      // -------------------------------------------------
      if (bill.maintenance?.maintenanceAmount) {
        const mAmount = bill.maintenance.maintenanceAmount || 0;

        maintenanceTotal += mAmount;

        if (bill.status === "Paid") {
          maintenanceCollected += mAmount;
        }
      }


      // -------------------------------------------------
      // ---------------- Electricity Calculation --------
      // -------------------------------------------------
      if (bill.electricity) {

        const elecAmount = bill.electricity.electricityAmount || 0;
        const dgAmount = bill.electricity.dgAmount || 0;
        const surchargeAmount = bill.electricity.surchargeAmount || 0;

        // ✔ FINAL ELECTRICITY TOTAL FOR THIS BILL
        const totalElec = elecAmount + dgAmount + surchargeAmount;

        electricityTotal += totalElec;

        if (bill.status === "Paid") {
          electricityCollected += totalElec;
        }
      }

    });

    // -----------------------------------------
    // ----------- FINAL SUMMARY ---------------
    // -----------------------------------------
    const summary = {
      maintenance: {
        total: maintenanceTotal,
        collected: maintenanceCollected,
        pending: maintenanceTotal - maintenanceCollected,
        percent: maintenanceTotal === 0 ? 0 : (maintenanceCollected / maintenanceTotal) * 100,
      },

      electricity: {
        total: electricityTotal,
        collected: electricityCollected,
        pending: electricityTotal - electricityCollected,
        percent: electricityTotal === 0 ? 0 : (electricityCollected / electricityTotal) * 100,
      },

      total: {
        total: maintenanceTotal + electricityTotal,
        collected: maintenanceCollected + electricityCollected,
        pending:
          (maintenanceTotal - maintenanceCollected) +
          (electricityTotal - electricityCollected),

        percent:
          (maintenanceTotal + electricityTotal) === 0
            ? 0
            : ((maintenanceCollected + electricityCollected) /
              (maintenanceTotal + electricityTotal)) *
            100
      }
    };

    // Response
    res.status(200).json({
      success: true,
      message: "Billing summary fetched successfully",
      data: summary
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
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
