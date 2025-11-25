import Complaint from "../models/Complaints.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

/**
 * 🧾 USER / ADMIN - Create a new complaint
 */
import User from "../models/User.modal.js";
import Site from "../models/masters/site.modal.js";
import mongoose from "mongoose";
import Unit from "../models/masters/Unit.modal.js";
import Supervisor from "../models/Supervisors.modal.js";

export const createComplaint = async (req, res) => {
  try {
    const {
      siteId,
      projectId,
      unitId,
      userId,
      addedBy,
      complaintTitle,
      complaintDescription,
      problemType,
      images,
    } = req.body;

    // 🔹 Basic field validation
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

    // 🔹 Validate ObjectIds
    const objectIds = { siteId, unitId, userId };
    for (const [key, value] of Object.entries(objectIds)) {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        return sendError(res, `Invalid ${key}`, 400);
      }
    }

    // 🔹 Check user existence
    const user = await User.findById(userId);
    if (!user) return sendError(res, "User not found", 404);

    // 🔹 Validate site, project, and unit existence
    const site = await Site.findById(siteId);
    if (!site) return sendError(res, "Site not found", 404);

    // const project = await Project.findById(projectId);
    // if (!project) return sendError(res, "Project not found", 404);

    const unit = await Unit.findById(unitId);
    if (!unit) return sendError(res, "Unit not found", 404);

    // 🔹 Hierarchy validation
    // if (String(project.siteId) !== String(site._id)) {
    //   return sendError(
    //     res,
    //     "Project does not belong to the specified Site",
    //     400
    //   );
    // }

    if (
      String(unit.siteId) !== String(site._id)
      // ||
      // String(unit.projectId) !== String(project._id)
    ) {
      return sendError(
        res,
        "Unit is not correctly linked with the given Site and Project",
        400
      );
    }

    // 🔹 Create complaint
    const complaint = await Complaint.create({
      siteId,
      // projectId,
      unitId,
      userId,
      addedBy,
      complaintTitle,
      complaintDescription,
      problemType,
      images,
      status: "Open",
      statusHistory: [
        {
          status: "Open",
          updatedBy: userId,
          updatedByRole: addedBy,
          comment: "Complaint created",
        },
      ],
    });

    return sendSuccess(res, "Complaint submitted successfully", complaint, 201);
  } catch (error) {
    console.error("Create Complaint Error:", error);
    return sendError(res, "Failed to create complaint", 500, error.message);
  }
};

/**
 * 🔄 UPDATE COMPLAINT — status transitions + full context
 */
export const updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      action,
      userId,
      userRole, // Admin / Supervisor / HelpDesk / Customer
      comment,
      supervisorDetails,
      materialDemand,
      resolution,
      closureDetails,
      repushedDetails,
    } = req.body;

    // -----------------------------
    //  Validate input
    // -----------------------------
    if (!id) return sendError(res, "Complaint ID is required");
    if (!action) return sendError(res, "Action is required");
    if (!userRole) return sendError(res, "User role is required");

    const complaint = await Complaint.findById(id);
    if (!complaint) return sendError(res, "Complaint not found", 404);

    const currentStatus = complaint.status;

    // -------------------------------------------
    //  ACTION → STATUS MAP BASED ON YOUR ENUM
    // -------------------------------------------
    const actionStatusMap = {
      review: "Review By Supervisor",
      raiseMaterialDemand: "Raise Material Demand",
      workInProgress: "Work in Progress",
      resolve: "Closed By Supervisor",
      repush: "Repush By Help Desk",
      verifyResolution: "Closed By Help Desk",
    };

    let newStatus = actionStatusMap[action];
    if (!newStatus) return sendError(res, "Invalid action value");

    // ------------------------------------------------------------
    // Allowed transition rules (based on your enum)
    // ------------------------------------------------------------
    const allowedTransitions = {
      Open: [
        "Review By Supervisor",
        "Raise Material Demand",
        "Work in Progress",
        "Closed By Supervisor",
        "Repush By Help Desk",
        "Closed By Help Desk",
      ],

      "Review By Supervisor": [
        "Raise Material Demand",
        "Work in Progress",
        "Closed By Supervisor",
        "Repush By Help Desk",
      ],

      "Raise Material Demand": [
        "Work in Progress",
        "Closed By Supervisor",
        "Repush By Help Desk",
      ],

      "Work in Progress": ["Closed By Supervisor", "Repush By Help Desk"],

      "Closed By Supervisor": [
        "Closed By Help Desk", // help desk final closure
        "Repush By Help Desk",
      ],

      "Repush By Help Desk": ["Review By Supervisor", "Work in Progress"],

      "Closed By Help Desk": [], // final state
    };

    // skip if status is same
    if (currentStatus === newStatus) {
      return sendSuccess(res, `Already in '${newStatus}'`, complaint);
    }

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      return sendError(
        res,
        `Invalid transition: '${currentStatus}' → '${newStatus}'`
      );
    }

    // ------------------------------------------------------------
    // HISTORY ENTRY STRUCTURE
    // ------------------------------------------------------------
    const historyEntry = {
      updatedBy: userId,
      updatedByRole: userRole,
      comment: comment || "",
      updatedAt: new Date(),
      status: newStatus,
    };

    // ------------------------------------------------------------
    // ACTION HANDLERS
    // ------------------------------------------------------------

    /**
     * 1) REVIEW BY SUPERVISOR
     */
    if (action === "review") {
      if (userRole !== "Admin") {
        // supervisor must be valid only when NOT admin
        if (!supervisorDetails?.supervisorId) {
          return sendError(res, "Supervisor ID required");
        }

        const supervisor = await Supervisor.findById(
          supervisorDetails.supervisorId
        );
        if (!supervisor) return sendError(res, "Supervisor not found", 404);

        historyEntry.supervisorDetails = {
          supervisorId: supervisor._id,
          comments: supervisorDetails.comments || "",
          images: supervisorDetails.images || [],
        };
      } else {
        // Admin reviewing → no supervisor validation
        historyEntry.supervisorDetails = {
          supervisorId: null,
          comments: supervisorDetails?.comments || "Reviewed by Admin",
          images: supervisorDetails?.images || [],
        };
      }
    }

    /**
     * 2) RAISE MATERIAL DEMAND
     */
    if (action === "raiseMaterialDemand") {
      if (!materialDemand)
        return sendError(res, "Material demand details required");
      // Detect if input is ObjectId
      if (mongoose.Types.ObjectId.isValid(materialDemand.materialName)) {
        req.body.materialName = new mongoose.Types.ObjectId(
          materialDemand.materialName
        );
      }
      historyEntry.materialDemand = materialDemand;
    }

    /**
     * 3) WORK IN PROGRESS
     */
    if (action === "workInProgress") {
      historyEntry.comment = comment || "Work started";
    }

    /**
     * 4) CLOSED BY SUPERVISOR
     */
    if (action === "closeBySupervisor") {
      if (!closureDetails) return sendError(res, "Closure details required");

      historyEntry.closureDetails = closureDetails;
    }

    /**
     * 5) REPUSH BY HELP DESK
     */
    if (action === "repush") {
      historyEntry.repushedDetails = {
        count: (complaint?.repushedDetails?.count || 0) + 1,
        reason: repushedDetails?.reason || comment || "Repushed",
        repushedAt: new Date(),
      };
    }

    /**
     * 6) CLOSED BY HELP DESK
     */
    if (action === "closeByHelpDesk") {
      if (!closureDetails) return sendError(res, "Closure details required");

      historyEntry.closureDetails = closureDetails;
    }

    // ------------------------------------------------------------
    // SAVE THE RESULT
    // ------------------------------------------------------------
    complaint.status = newStatus;
    complaint.statusHistory.push(historyEntry);
    await complaint.save();

    return sendSuccess(
      res,
      `Complaint updated successfully (${newStatus})`,
      complaint
    );
  } catch (error) {
    console.error("Update Complaint Error:", error);
    return sendError(res, "Failed to update complaint", 500, error.message);
  }
};

/**
 * 📋 GET ALL COMPLAINTS — with filters + pagination
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
      addedBy,
      userId,
      isPagination = "true",
      page = 1,
      limit = 10,
    } = req.query;

    const match = {};

    const statusMap = {
      open: "Open",
      review: "Review By Supervisor",
      raiseMaterialDemand: "Raise Material Demand",
      workInProgress: "Work in Progress",
      resolve: "Closed By Supervisor",
      verifyResolution: "Closed Help Desk",
      repush: "Repush By Help Desk",
    };

    if (status) {
      match.status = statusMap[status] || status;
    }
    if (siteId) match.siteId = siteId;
    // if (projectId) match.projectId = projectId;
    if (addedBy) match.addedBy = addedBy;

    if (userId) match.userId = userId;

    if (search?.trim()) {
      const regex = new RegExp(search.trim(), "i");
      match.$or = [
        { complaintTitle: { $regex: regex } },
        { complaintDescription: { $regex: regex } },
      ];
    }

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
      .populate("siteId", "siteName")
      // .populate("projectId", "projectName")
      .populate("unitId", "unitType unitNumber")
      .populate("statusHistory.materialDemand.materialName")
      .sort({ createdAt: -1 });

    const total = await Complaint.countDocuments(match);

    if (isPagination === "true") {
      query = query.skip((page - 1) * limit).limit(parseInt(limit));
    }

    const complaints = await query;
    return sendSuccess(res, "Complaints fetched successfully", {
      complaints,
      totalComplaints: total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
    });
  } catch (error) {
    return sendError(res, "Failed to fetch complaints", 500, error.message);
  }
};

// 🧩 Delete Complaint
export const deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔹 Validate ID
    if (!id) {
      return sendError(res, "Complaint ID is required", 400);
    }

    // 🔹 Find and delete complaint
    const deletedComplaint = await Complaint.findByIdAndDelete(id);

    if (!deletedComplaint) {
      return sendError(res, "Complaint not found", 404);
    }

    // ✅ Return success
    return sendSuccess(res, "Complaint deleted successfully", deletedComplaint);
  } catch (error) {
    console.error("❌ Delete Complaint Error:", error);
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
    const {
      status,
      fromDate,
      toDate,
      search,
      isPagination = "true",
      page = 1,
      limit = 10,
    } = req.query;

    if (!userId && !complaintId)
      return sendSuccess(
        res,
        "Please provide either userId or complaintId",
        400
      );

    let match = {};

    // 🔹 If fetching a single complaint
    if (complaintId) {
      const complaint = await Complaint.findById(complaintId)
        .populate("userId", "name email role")
        .populate({
          path: "statusHistory.supervisorDetails.supervisorId",
          select: "name email phone", // optional, select desired fields
        })
        .populate({
          path: "statusHistory.resolution.resolvedBy",
          select: "name phone email", // fields from User model
        })

        .populate("siteId", "siteName")
        // .populate("projectId", "projectName")
        .populate("statusHistory.materialDemand.materialName")
        .populate("unitId", "unitType unitNumber");

      if (!complaint) return sendError(res, "Complaint not found", 404);

      return sendSuccess(res, "Complaint fetched successfully", complaint, 200);
    }

    // 🔹 Building filters for user complaints
    match.userId = userId;

    if (status) match.status = status;

    if (search?.trim()) {
      const regex = new RegExp(search.trim(), "i");
      match.$or = [
        { complaintTitle: { $regex: regex } },
        { complaintDescription: { $regex: regex } },
      ];
    }

    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) match.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const nextDay = new Date(toDate);
        nextDay.setDate(nextDay.getDate() + 1);
        match.createdAt.$lt = nextDay;
      }
    }

    // 🔹 Query setup
    let query = Complaint.find(match)
      .populate("userId", "name email role")
      .populate({
        path: "statusHistory.supervisorDetails.supervisorId",
        select: "name email phone", // optional, select desired fields
      })
      .populate({
        path: "statusHistory.resolution.resolvedBy",
        select: "name phone email", // fields from User model
      })

      .populate("siteId", "siteName")
      // .populate("projectId", "projectName")
      .populate("unitId", "unitType unitNumber")
      .sort({ createdAt: -1 });

    const total = await Complaint.countDocuments(match);

    if (isPagination === "true") {
      query = query.skip((page - 1) * limit).limit(parseInt(limit));
    }

    const complaints = await query;

    if (!complaints.length)
      return sendSuccess(
        res,
        "No complaints found for this user",
        complaints,
        200
      );

    return sendSuccess(res, "Complaints fetched successfully", {
      complaints,
      totalComplaints: total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
    });
  } catch (error) {
    console.error("Get Complaints Error:", error);
    return sendError(res, "Failed to fetch complaints", 500, error.message);
  }
};
