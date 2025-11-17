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

    // 📌 Date filter applied on generatedOn field
    if (fromDate && toDate) {
      match.generatedOn = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate + "T23:59:59"),
      };
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
    // Aggregate counts by status
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

    stats.forEach((item) => {
      const status = item._id;
      const count = item.count;

      totalComplaints += count;

      // 📌 Open-related statuses
      if (
        status === "Open" ||
        status === "Under Review" ||
        status === "Material Demand Raised" ||
        status === "WorkinProgress"
      ) {
        totalOpenComplaints += count;
      }

      // 📌 Resolved
      if (status === "Resolved") {
        totalResolvedComplaints += count;
      }

      // 📌 Closed
      if (status === "Closed") {
        totalClosedComplaints += count;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        totalComplaints,
        totalOpenComplaints,
        totalResolvedComplaints,
        totalClosedComplaints,
      },
    });
  } catch (error) {
    console.error("Complaint stats error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
