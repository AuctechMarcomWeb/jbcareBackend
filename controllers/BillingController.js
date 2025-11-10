import mongoose from "mongoose";
import Billing from "../models/Billing.modal.js";

import Landlord from "../models/LandLord.modal.js";

import MaintainCharges from "../models/MantainCharge.modal.js";
import Unit from "../models/masters/Unit.modal.js";

// 🟢 CREATE BILL
export const createBilling = async (req, res) => {
  try {
    const bill = await Billing.create(req.body);
    return res.status(201).json({
      success: true,
      message: "Billing record created successfully",
      data: bill,
    });
  } catch (error) {
    console.error("❌ createBilling Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
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
      .sort({ generatedOn: -1 })
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
    const updatedBill = await Billing.findByIdAndUpdate(id, req.body, {
      new: true,
    });

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
    const now = new Date();
    const firstDay = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
    );

    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();

    const landlords = await Landlord.find({ isActive: true }).populate(
      "unitIds"
    );

    if (!landlords.length) {
      return res.status(404).json({
        success: false,
        message: "No landlords found",
        data: [],
      });
    }

    const summary = [];

    for (const landlord of landlords) {
      let totalAmount = 0;

      let totalGST = 0;
      let totalBill = 0;
      let totalMaintenance = 0;
      let totalElectricity = 0;

      const units = landlord.unitIds;

      for (const unitId of units) {
        const unit = await Unit.findById(unitId);
        if (!unit) continue;

        const maintainCharge = await MaintainCharges.findOne({
          siteId: unit.siteId,
          unitId: unit._id,
          isActive: true,
        });

        console.log("maintainCharge", maintainCharge);

        if (maintainCharge) {
          // calculate maintenance amount based on rate type
          let maintenance = 0;
          if (maintainCharge.rateType === "per_sqft") {
            maintenance =
              (unit.areaSqFt || 0) * (maintainCharge.rateValue || 0);
          } else {
            maintenance = maintainCharge.rateValue || 0;
          }

          console.log("maintenance", maintenance);

          // apply GST
          const gst = (maintenance * (maintainCharge.gstPercent || 0)) / 100;

          totalMaintenance += maintenance;
          totalGST += gst;
          totalBill += totalMaintenance + totalGST;
        } else {
          const maintenance = 100;
          const gstPercent = 18;
          const gst = (maintenance * (gstPercent || 0)) / 100;

          totalMaintenance += maintenance;
          totalGST += gst;
          totalBill += maintenance + gst;
        }

        // 6️⃣ Get any bills generated this month for this unit
        // const bills = await Billing.find({
        //   landlordId: landlord._id,
        //   unitId: unit._id,
        //   fromDate: { $gte: firstDay },
        //   toDate: { $lte: now },
        // });

        // for (const bill of bills) {
        //   totalElectricity += bill.electricityAmount || 0;
        //   totalAmount += bill.totalAmount || 0;
        // }

        totalElectricity = 1;

        totalAmount += totalElectricity + totalBill;
      }

      const allBills = await Billing.find({ landlordId: landlord._id });

      const paidBills = allBills.filter((b) => b.status === "Paid");
      const unpaidBills = allBills.filter((b) => b.status === "Unpaid");

      const paidCount = paidBills.length;
      const unpaidCount = unpaidBills.length;

      const paidBillTotal = paidBills.reduce(
        (sum, bill) => sum + (bill.totalAmount || 0),
        0
      );

      const previousUnpaidBill = unpaidBills.reduce(
        (sum, bill) => sum + (bill.totalAmount || 0),
        0
      );

      // 7️⃣ Calculate per-day maintenance for current month
      const perDayMaintenance = totalAmount / daysInMonth;
      const activeDays =
        Math.floor((now - firstDay) / (1000 * 60 * 60 * 24)) + 1;

      console.log("activeDays", activeDays);

      const billingTillToday = activeDays * perDayMaintenance;

      summary.push({
        landlordId: landlord._id,
        landlordName: landlord.name,
        totalMaintenance: totalMaintenance.toFixed(2),
        totalElectricity: totalElectricity.toFixed(2),
        totalGST: totalGST.toFixed(2),
        totalBillingAmount: totalAmount.toFixed(2),
        perDayMaintenance: perDayMaintenance.toFixed(2),
        monthDays: daysInMonth,
        billingTillToday: billingTillToday.toFixed(2),
        previousUnpaidBill: previousUnpaidBill.toFixed(2),
        paidCount,
        unpaidCount,
        fromDate: firstDay,
        toDate: now,
      });
    }

    // 8️⃣ Send response
    res.status(200).json({
      success: true,
      message: "Current month billing summary fetched successfully",
      count: summary.length,
      data: summary,
    });
  } catch (error) {
    console.error("❌ getCurrentMonthBillingSummary Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
