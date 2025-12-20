import User from "../models/User.modal.js";
import Complaint from "../models/Complaints.modal.js";
import Billing from "../models/Billing.modal.js";
import Bills from "../models/Bills.modal.js";
import StockItems from "../models/Stock management/StockItems.modal.js";
import Landlord from "../models/LandLord.modal.js";
import Tenant from "../models/Tenant.modal.js";
import Supervisor from "../models/Supervisors.modal.js";
import StockIn from "../models/Stock management/StockIn.modal.js";

export const getDashboardStats = async (req, res) => {
  try {
    const { filterType } = req.query;

    let dateFilter = {};
    if (filterType === "month") {
      const now = new Date();
      dateFilter = {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
    } else if (filterType === "year") {
      const now = new Date();
      dateFilter = {
        $gte: new Date(now.getFullYear(), 0, 1),
        $lte: new Date(now.getFullYear(), 11, 31),
      };
    }

    // ----------------------------------------------------------
    // 🧑‍🤝‍🧑 USERS → based on landlords + tenants + supervisors
    // ----------------------------------------------------------
    const landlordActive = await Landlord.countDocuments({ isActive: true });
    const landlordInactive = await Landlord.countDocuments({ isActive: false });

    const tenantActive = await Tenant.countDocuments({ isActive: true });
    const tenantInactive = await Tenant.countDocuments({ isActive: false });

    const supervisorActive = await Supervisor.countDocuments({
      isActive: true,
    });
    const supervisorInactive = await Supervisor.countDocuments({
      isActive: false,
    });

    const totalActiveUsers = landlordActive + tenantActive + supervisorActive;
    const totalInactiveUsers =
      landlordInactive + tenantInactive + supervisorInactive;

    const totalUsers =
      landlordActive +
      landlordInactive +
      tenantActive +
      tenantInactive +
      supervisorActive +
      supervisorInactive;

    // ----------------------------------------------------------
    // 🔥 COMPLAINT STATS
    // ----------------------------------------------------------
    const complaintDateQuery = filterType ? { createdAt: dateFilter } : {};

    const totalComplaints = await Complaint.countDocuments(complaintDateQuery);
    const totalResolvedBySupervisor = await Complaint.countDocuments({
      status: "Closed By Supervisor",
      ...complaintDateQuery,
    });
    const totalClosedByHelpDesk = await Complaint.countDocuments({
      status: "Closed By Help Desk",
      ...complaintDateQuery,
    });
    const totalRepushedComplaints = await Complaint.countDocuments({
      status: "Repush By Help Desk",
      ...complaintDateQuery,
    });

    // ----------------------------------------------------------
    // 💰 BILLING STATS
    // ----------------------------------------------------------
    const billingDateQuery = filterType ? { generatedOn: dateFilter } : {};

    const totalBillingAgg = await Billing.aggregate([
      { $match: billingDateQuery },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalBilling = totalBillingAgg[0]?.total || 0;

    const totalPaidBillingAgg = await Billing.aggregate([
      { $match: { ...billingDateQuery, status: "Paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalPaidBilling = totalPaidBillingAgg[0]?.total || 0;

    const totalUnpaidBillingAgg = await Billing.aggregate([
      { $match: { ...billingDateQuery, status: "Unpaid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalUnpaidBilling = totalUnpaidBillingAgg[0]?.total || 0;

    // ----------------------------------------------------------
    // 📦 INVENTORY STATS
    // ----------------------------------------------------------
    const inventoryQuery = filterType ? { createdAt: dateFilter } : {};

    const totalItems = await StockItems.countDocuments({
      isDeleted: false,
      ...inventoryQuery,
    });
    const totalInStockItems = await StockItems.countDocuments({
      isDeleted: false,
      status: "IN STOCK",
      ...inventoryQuery,
    });
    const totalLowStockItems = await StockItems.countDocuments({
      isDeleted: false,
      status: "LOW STOCK",
      ...inventoryQuery,
    });
    const totalOutOfStockItems = await StockItems.countDocuments({
      isDeleted: false,
      status: "OUT OF STOCK",
      ...inventoryQuery,
    });

    return res.status(200).json({
      success: true,
      filterApplied: filterType || "overall",
      data: {
        // Users
        totalUsers,
        totalActiveUsers,
        totalInactiveUsers,

        // Complaints
        totalComplaints,
        totalResolvedBySupervisor,
        totalClosedByHelpDesk,
        totalRepushedComplaints,

        // Billing
        totalBilling,
        totalPaidBilling,
        totalUnpaidBilling,

        // Inventory
        totalItems,
        totalInStockItems,
        totalLowStockItems,
        totalOutOfStockItems,
      },
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: error.message,
    });
  }
};


export const getDashboardSummary = async (req, res) => {
  try {

    // ===========================
    // 1️⃣ LANDLORD SUMMARY
    // ===========================

    const totalLandlords = await Landlord.countDocuments();
    const activeLandlords = await Landlord.countDocuments({ isActive: true });
    const inactiveLandlords = await Landlord.countDocuments({ isActive: false });

    // ===========================
    // 2️⃣ TENANT SUMMARY
    // ===========================
    const totalTenants = await Tenant.countDocuments();
    const activeTenants = await Tenant.countDocuments({ isActive: true });
    const inactiveTenants = await Tenant.countDocuments({ isActive: false });

    // ===========================
    // 3️⃣ BILLS SUMMARY
    // ===========================
    const totalBills = await Bills.countDocuments();

    const paidBills = await Bills.countDocuments({ status: "Paid" });
    const unpaidBills = await Bills.countDocuments({ status: "Unpaid" });

    // Total paid amount
    const paidAmountAgg = await Bills.aggregate([
      { $match: { status: "Paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    const paidAmount = paidAmountAgg[0]?.total || 0;

    // Total unpaid amount
    const unpaidAmountAgg = await Bills.aggregate([
      { $match: { status: "Unpaid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    const unpaidAmount = unpaidAmountAgg[0]?.total || 0;


    // ===========================
    // 4️⃣ COMPLAINT SUMMARY (Status Wise)
    // ===========================

    const totalcomplaint = await Complaint.countDocuments();
    const complaintStatuses = [
      "Open",
      "Review By Supervisor",
      "Raise Material Demand",
      "Work in Progress",
      "Closed By Supervisor",
      "Repush By Help Desk",
      "Closed By Help Desk",
    ];

    const complaintSummary = {};

    for (const status of complaintStatuses) {
      const count = await Complaint.countDocuments({ status });
      complaintSummary[status] = count;
    }



    // ===========================
    // 5️⃣ STOCK SUMMARY
    // ===========================

    const totalStockItems = await StockIn.countDocuments({ isDeleted: false });
    // const totalStockItems = await StockItems.countDocuments({ isDeleted: false });

    const inStock = await StockIn.countDocuments({
      isDeleted: false,
      status: "IN STOCK",
    });

    const lowStock = await StockIn.countDocuments({
      isDeleted: false,
      status: "LOW STOCK",
    });

    const outOfStock = await StockIn.countDocuments({
      isDeleted: false,
      status: "OUT OF STOCK",
    });


    const stockData = {
      totalStockItems, inStock, lowStock, outOfStock
    }



    // ===========================
    // FINAL RESPONSE
    // ===========================
    return res.status(200).json({
      success: true,
      message: "Dashboard summary fetched successfully",
      data: {
        landlords: {
          total: totalLandlords,
          active: activeLandlords,
          inactive: inactiveLandlords,
        },
        tenants: {
          total: totalTenants,
          active: activeTenants,
          inactive: inactiveTenants,
        },
        bills: {
          totalBills,
          paidBills,
          unpaidBills,
          paidAmount,
          unpaidAmount,
        },
        complaints: {
          totalcomplaint,
          ...complaintSummary
        }, stockData
      }
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error fetching dashboard summary",
      error: error.message,
    });
  }
};
