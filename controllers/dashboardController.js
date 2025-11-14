import Unit from "../models/masters/Unit.modal.js";
import Billing from "../models/Billing.modal.js";
import User from "../models/User.modal.js";

export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();

    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // ----------------------------------------------------
    // 🧑‍🤝‍🧑 USER STATS
    // ----------------------------------------------------
    const totalUsers = await User.countDocuments();

    // ----------------------------------------------------
    // 🏠 PROPERTY STATS
    // ----------------------------------------------------
    const totalUnits = await Unit.countDocuments();

    const soldProperties = await Unit.countDocuments({
      landlordId: { $ne: null },
    });

    const availableProperties = await Unit.countDocuments({
      landlordId: null,
    });

    // ----------------------------------------------------
    // 💰 BILLING STATS (OVERALL)
    // ----------------------------------------------------

    // TOTAL BILLING EVER
    const allBillingAgg = await Billing.aggregate([
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalBilling = allBillingAgg[0]?.total || 0;

    // TOTAL PAID BILLING (EVER)
    const paidBillingAgg = await Billing.aggregate([
      { $match: { status: "Paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalPaidBilling = paidBillingAgg[0]?.total || 0;

    // TOTAL UNPAID BILLING (EVER)
    const unpaidBillingAgg = await Billing.aggregate([
      { $match: { status: "Unpaid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalUnpaidBilling = unpaidBillingAgg[0]?.total || 0;

    // ----------------------------------------------------
    // 💰 BILLING STATS (MONTHLY)
    // ----------------------------------------------------

    // THIS MONTH'S TOTAL BILLING
    const monthlyBillingAgg = await Billing.aggregate([
      {
        $match: {
          generatedOn: { $gte: firstDay, $lte: lastDay },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalMonthlyBilling = monthlyBillingAgg[0]?.total || 0;

    // THIS MONTH PAID
    const monthlyPaidAgg = await Billing.aggregate([
      {
        $match: {
          generatedOn: { $gte: firstDay, $lte: lastDay },
          status: "Paid",
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalMonthlyBillingPaid = monthlyPaidAgg[0]?.total || 0;

    // THIS MONTH UNPAID
    const monthlyUnpaidAgg = await Billing.aggregate([
      {
        $match: {
          generatedOn: { $gte: firstDay, $lte: lastDay },
          status: "Unpaid",
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalMonthlyBillingUnpaid = monthlyUnpaidAgg[0]?.total || 0;

    // ----------------------------------------------------
    // 📊 RESPONSE (READY FOR FRONTEND FORMAT)
    // ----------------------------------------------------

    return res.status(200).json({
      success: true,
      data: {
        // USERS
        totalUsers,

        // UNITS
        totalUnits,
        soldProperties,
        availableProperties,

        // OVERALL BILLING
        totalBilling,
        totalPaidBilling,
        totalUnpaidBilling,

        // MONTHLY BILLING
        totalMonthlyBilling,
        totalMonthlyBillingPaid,
        totalMonthlyBillingUnpaid,
      },
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: error.message,
    });
  }
};
