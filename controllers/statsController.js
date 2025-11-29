// controllers/siteController.js
import Billing from "../models/Billing.modal.js";
import Complaint from "../models/Complaints.modal.js";
import Site from "../models/masters/site.modal.js";
import Unit from "../models/masters/Unit.modal.js";

export const getSiteUnitCounts = async (req, res) => {
  try {
    const data = await Site.aggregate([
      {
        $lookup: {
          from: "units",
          localField: "_id",
          foreignField: "siteId",
          as: "units",
        },
      },
      {
        $project: {
          site: "$siteName",
          units: { $size: "$units" },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getBillingSummary = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const match = {};

    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);

      match.fromDate = { $lte: end };
      match.toDate = { $gte: start };
    }

    const result = await Billing.aggregate([
      { $match: match },

      {
        $group: {
          _id: null,
          totalBillingAmount: { $sum: "$totalAmount" },
          totalCollectedAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "Paid"] }, "$totalAmount", 0],
            },
          },
          totalUnpaidAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "Unpaid"] }, "$totalAmount", 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalBillingAmount: 1,
          totalCollectedAmount: 1,
          totalUnpaidAmount: 1,
        },
      },
    ]);

    const data = result[0] || {
      totalBillingAmount: 0,
      totalCollectedAmount: 0,
      totalUnpaidAmount: 0,
    };

    // 📌 Calculate percentage
    const collectedPercentage =
      data.totalBillingAmount === 0
        ? 0
        : ((data.totalCollectedAmount / data.totalBillingAmount) * 100).toFixed(
            2
          );

    const electricityDummy = {
      totalElectricity: 35000,
      totalPaidElectricity: 21000,
      totalUnpaidElectricity: 14000,
    };

    // --------------------------------------------------
    // 📌 ELECTRICITY COLLECTION PERCENTAGE
    // --------------------------------------------------
    const electricityPercentage =
      electricityDummy.totalElectricity === 0
        ? 0
        : Number(
            (
              (electricityDummy.totalPaidElectricity /
                electricityDummy.totalElectricity) *
              100
            ).toFixed(2)
          );

    return res.status(200).json({
      success: true,
      data: {
        ...data,
        collectedPercentage: Number(collectedPercentage),
        // Electricity fields
        ...electricityDummy,
        electricityPercentage, // <-- NEW
      },
    });
  } catch (error) {
    console.error("Billing summary error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getComplaintStats = async (req, res) => {
  try {
    const stats = await Complaint.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    let totalComplaints = 0;
    let totalOpenComplaints = 0;
    let totalResolvedComplaints = 0;
    let totalClosedComplaints = 0;
    let totalRepushedComplaints = 0;
    let totalInProgressComplaints = 0;

    // Status groups
    const OPEN_STATUSES = [
      "Open",
      "Review By Supervisor",
      "Raise Material Demand",
      // Work in Progress will be separate
    ];

    const CLOSED_STATUSES = ["Closed By Help Desk"];

    stats.forEach((item) => {
      const status = item._id;
      const count = item.count;

      totalComplaints += count;

      // -----------------------------
      // 1️⃣ In Progress (Separate)
      // -----------------------------
      if (status === "Work in Progress") {
        totalInProgressComplaints += count;
      }

      // -----------------------------
      // 2️⃣ Open (Except In Progress)
      // -----------------------------
      if (OPEN_STATUSES.includes(status)) {
        totalOpenComplaints += count;
      }

      // -----------------------------
      // 3️⃣ Repushed (Separate)
      // -----------------------------
      if (status === "Repush By Help Desk") {
        totalRepushedComplaints += count;
      }

      // -----------------------------
      // 4️⃣ Closed (Only Closed By Help Desk)
      // -----------------------------
      if (CLOSED_STATUSES.includes(status)) {
        totalClosedComplaints += count;
      }

      // -----------------------------
      // 5️⃣ Resolved (If still needed)
      // -----------------------------
      if (status === "Closed By Supervisor") {
        totalResolvedComplaints += count;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        totalComplaints,
        open: totalOpenComplaints,
        inProgress: totalInProgressComplaints,
        repushed: totalRepushedComplaints,
        resolved: totalResolvedComplaints,
        closed: totalClosedComplaints,
      },
    });
  } catch (error) {
    console.error("Complaint stats error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
