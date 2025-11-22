import User from "../models/User.modal.js";
import Complaint from "../models/Complaints.modal.js";
import Billing from "../models/Billing.modal.js";
import StockItems from "../models/Stock management/StockItems.modal.js";
import Landlord from "../models/LandLord.modal.js";
import Tenant from "../models/Tenant.modal.js";
import Supervisor from "../models/Supervisors.modal.js";

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
