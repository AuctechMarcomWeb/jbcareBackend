import Complaint from "../models/Complaints.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

/**
 * 🧾 USER / ADMIN - Create a new complaint
 */
export const createComplaint = async (req, res) => {
  try {
    const {
      siteId,
      projectId,
      unitId,
      userId,
      addedBy, // "Landlord", "Tenant", or "Admin"
      complaintTitle,
      complaintDescription,
      images,
      source, // optional: "MobileApp" or "Helpdesk"
    } = req.body;

    // 🔹 Validation
    if (!complaintTitle?.trim())
      return sendError(res, "Complaint title is required", 400);
    if (!complaintDescription?.trim())
      return sendError(res, "Complaint description is required", 400);
    if (!addedBy)
      return sendError(
        res,
        "addedBy (Landlord, Tenant, or Admin) is required",
        400
      );

    // 🔹 Create complaint
    const complaint = await Complaint.create({
      siteId,
      projectId,
      unitId,
      userId,
      addedBy,
      complaintTitle,
      complaintDescription,
      images,
      status: "Pending",
      statusHistory: [
        {
          status: "Pending",
          updatedBy: userId,
          updatedByRole: addedBy,
          comment: "Complaint created",
        },
      ],
    });

    return sendSuccess(res, "Complaint submitted successfully", complaint, 201);
  } catch (error) {
    return sendError(res, "Failed to create complaint", 500, error.message);
  }
};

/**
 * 🔄 UNIVERSAL COMPLAINT UPDATE HANDLER
 */
export const updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      action, // "review", "raiseMaterialDemand", "resolve", "verifyResolution"
      supervisorComments,
      supervisorImages,
      resolvedImages,
      customerConfirmed,
      materialDemand, // { materialName, quantity, reason }
      userId,
      userRole, // "Admin" | "Supervisor" | "Landlord" | "Tenant"
      comment, // optional message for status change
    } = req.body;

    if (!action) return sendError(res, "Action type is required", 400);
    if (!userId) return sendError(res, "User ID is required", 400);
    // if (!userRole) return sendError(res, "User role is required", 400);

    const complaint = await Complaint.findById(id);
    if (!complaint) return sendError(res, "Complaint not found", 404);

    let newStatus = null;

    switch (action) {
      // Step 1️⃣: Supervisor reviews complaint
      case "review":
        newStatus = "Under Review";
        complaint.supervisorId = userId;
        complaint.supervisorComments = supervisorComments;
        complaint.supervisorImages = supervisorImages;
        complaint.verifiedAt = new Date();
        break;

      // Step 2️⃣: Supervisor raises material demand
      case "raiseMaterialDemand":
        if (!materialDemand)
          return sendError(res, "Material demand details are required", 400);
        newStatus = "Material Demand Raised";
        complaint.materialDemand = materialDemand;
        complaint.materialDemandRaisedBy = userId;
        complaint.materialDemandRaisedAt = new Date();
        break;

      // Step 3️⃣: Supervisor resolves complaint
      case "resolve":
        newStatus = "Resolved";
        complaint.resolvedBy = userId;
        complaint.resolvedImages = resolvedImages;
        complaint.resolvedAt = new Date();
        break;

      // Step 4️⃣: Customer verifies or repushes
      case "verifyResolution":
        if (customerConfirmed) {
          newStatus = "Closed";
          complaint.closedBy = userId;
          complaint.updatedByRole = userRole;
          complaint.closedAt = new Date();
        } else {
          newStatus = "Repushed";
          complaint.repushedCount = (complaint.repushedCount || 0) + 1;
          complaint.repushedAt = new Date();
        }
        break;

      default:
        return sendError(res, "Invalid action type", 400);
    }

    // ✅ Apply new status and record in history
    complaint.status = newStatus;
    complaint.updatedBy = userId;
    complaint.updatedByRole = userRole;
    complaint.comment = comment || `Complaint ${newStatus}`;

    await complaint.save({ validateModifiedOnly: true });

    return sendSuccess(
      res,
      `Complaint updated successfully (${newStatus})`,
      complaint,
      200
    );
  } catch (error) {
    return sendError(res, "Failed to update complaint", 500, error.message);
  }
};

/**
 * 📋 ADMIN / SUPERVISOR - Get all complaints (with filters + pagination)
 */
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
      addedBy,
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
    if (addedBy) match.addedBy = addedBy;
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

/**
 * ❌ DELETE - Remove a complaint (Admin/Supervisor Only)
 */
export const deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userRole } = req.body; // Include these in request body

    // if (!userId) return sendError(res, "User ID is required", 400);
    // if (!userRole) return sendError(res, "User role is required", 400);

    // ✅ Only Admin or Supervisor can delete
    if (!["Admin", "Supervisor"].includes(userRole)) {
      return sendError(res, "Unauthorized to delete complaints", 403);
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) return sendError(res, "Complaint not found", 404);

    await Complaint.findByIdAndDelete(id);

    return sendSuccess(
      res,
      "Complaint deleted successfully",
      {
        deletedComplaintId: id,
        // deletedBy: { userId, userRole },
      },
      200
    );
  } catch (error) {
    return sendError(res, "Failed to delete complaint", 500, error.message);
  }
};

/**
 * 📋 Get Complaints by User ID or Complaint ID
 * ✅ Examples:
 *    GET /api/complaints/user/671fc84a3c29f9a5f1b23456
 *    GET /api/complaints/6721a5e6c4b7a9b1bda4cfe2
 */
export const getComplaintsByUserOrId = async (req, res) => {
  try {
    const { userId, complaintId } = req.params;

    if (!userId && !complaintId)
      return sendError(res, "Please provide either userId or complaintId", 400);

    let complaints;

    if (complaintId) {
      // 🔹 Fetch single complaint
      complaints = await Complaint.findById(complaintId)
        .populate("userId", "name email role")
        .populate("supervisorId", "name email role")
        .populate("resolvedBy", "name email role")
        .populate("siteId", "siteName")
        .populate("projectId", "projectName")
        .populate("unitId", "unitType unitNumber");

      if (!complaints) return sendError(res, "Complaint not found", 404);
    } else {
      // 🔹 Fetch all complaints for that user
      complaints = await Complaint.find({ userId })
        .populate("siteId", "siteName")
        .populate("projectId", "projectName")
        .populate("unitId", "unitType unitNumber")
        .sort({ createdAt: -1 });

      if (!complaints.length)
        return sendError(res, "No complaints found for this user", 404);
    }

    return sendSuccess(res, "Complaints fetched successfully", complaints, 200);
  } catch (error) {
    return sendError(res, "Failed to fetch complaints", 500, error.message);
  }
};
