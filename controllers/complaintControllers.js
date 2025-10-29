import Complaint from "../models/Complaints.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

// USER - Create a new complaint (from App or Helpdesk)
export const createComplaint = async (req, res) => {
  try {
    const {
      siteId,
      projectId,
      unitId,
      userId,
      complaintTitle,
      complaintDescription,
      images,
      source, // optional: "MobileApp" or "Helpdesk"
    } = req.body;

    if (!complaintTitle?.trim())
      return sendError(res, "Complaint title is required", 400);
    if (!complaintDescription?.trim())
      return sendError(res, "Complaint description is required", 400);

    const complaint = await Complaint.create({
      siteId,
      projectId,
      unitId,
      userId,
      complaintTitle,
      complaintDescription,
      images,
      status: "New",
    });

    return sendSuccess(res, "Complaint submitted successfully", complaint, 201);
  } catch (error) {
    return sendError(res, "Failed to create complaint", 500, error.message);
  }
};

// 🔄 UNIVERSAL UPDATE HANDLER
export const updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Complaint update id==>", id);

    const {
      action, // "review", "raiseMaterialDemand", "resolve", "verifyResolution"
      supervisorComments,
      supervisorImages,
      resolvedImages,
      customerConfirmed,
      materialDemand, // expected { materialName, quantity, reason }
      userId,
    } = req.body;

    if (!action) return sendError(res, "Action type is required", 400);
    if (!userId) return sendError(res, "User ID is required", 400);
    const complaint = await Complaint.findById(id);
    if (!complaint) return sendError(res, "Complaint not found", 404);

    switch (action) {
      // Step 1️⃣: Supervisor reviews complaint
      case "review":
        complaint.status = "Under Review";
        complaint.supervisorId = userId;
        complaint.supervisorComments = supervisorComments;
        complaint.supervisorImages = supervisorImages;
        complaint.verifiedAt = new Date();
        break;

      // Step 2️⃣: Supervisor raises material demand (if required)
      case "raiseMaterialDemand":
        if (!materialDemand)
          return sendError(res, "Material demand details are required", 400);
        complaint.status = "Material Demand Raised";
        complaint.materialDemand = materialDemand;
        complaint.materialDemandRaisedBy = userId;
        complaint.materialDemandRaisedAt = new Date();
        break;

      // Step 3️⃣: Supervisor resolves complaint
      case "resolve":
        complaint.status = "Resolved";
        complaint.resolvedBy = userId;
        complaint.resolvedImages = resolvedImages;
        complaint.resolvedAt = new Date();
        break;

      // Step 4️⃣: Customer Care verifies resolution
      case "verifyResolution":
        if (customerConfirmed) {
          complaint.status = "Closed";
          complaint.closedBy = userId;
          complaint.closedAt = new Date();
        } else {
          complaint.status = "Repushed";
          complaint.repushedCount = (complaint.repushedCount || 0) + 1;
          complaint.repushedAt = new Date();
        }
        break;

      default:
        return sendError(res, "Invalid action type", 400);
    }

    await complaint.save();

    return sendSuccess(
      res,
      `Complaint updated successfully for action: ${action}`,
      complaint,
      200
    );
  } catch (error) {
    return sendError(res, "Failed to update complaint", 500, error.message);
  }
};

// 🧾 ADMIN / SUPERVISOR - Get all complaints with filters & pagination
export const getAllComplaints = async (req, res) => {
  try {
    const {
      search,
      fromDate,
      toDate,
      status,
      siteId,
      projectId,
      supervisorId,
      userId,
      source,
      isPagination = "true",
      page = 1,
      limit = 10,
    } = req.query;

    const match = {};

    if (search?.trim()) {
      const regex = new RegExp(search.trim(), "i");
      match.$or = [
        { complaintTitle: { $regex: regex } },
        { complaintDescription: { $regex: regex } },
      ];
    }

    if (status) match.status = status;
    if (siteId) match.siteId = siteId;
    if (projectId) match.projectId = projectId;
    if (supervisorId) match.supervisorId = supervisorId;
    if (userId) match.userId = userId;
    if (source) match.source = source;

    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) match.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const nextDay = new Date(toDate);
        nextDay.setDate(nextDay.getDate() + 1);
        match.createdAt.$lt = nextDay;
      }
    }

    let query = Complaint.find(match)
      .populate("userId", "name email role")
      .populate("supervisorId", "name email role")
      .populate("resolvedBy", "name email role")
      .populate("siteId", "siteName")
      .populate("projectId", "projectName")
      .populate("unitId", "unitType unitNumber")
      .sort({ createdAt: -1 });

    const total = await Complaint.countDocuments(match);

    if (isPagination === "true") {
      query = query.skip((page - 1) * limit).limit(parseInt(limit));
    }

    const complaints = await query;

    return sendSuccess(
      res,
      "Complaints fetched successfully",
      {
        complaints,
        totalComplaints: total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
      200
    );
  } catch (error) {
    return sendError(res, "Failed to fetch complaints", 500, error.message);
  }
};
