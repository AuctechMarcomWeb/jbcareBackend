import Complaint from "../models/Complaints.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

/**
 * 🧾 USER / ADMIN - Create a new complaint
 */
import User from "../models/User.modal.js";
import Site from "../models/masters/site.modal.js";
import Project from "../models/masters/Project.modal.js";
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
      addedBy, // "Landlord", "Tenant", or "Admin"
      complaintTitle,
      complaintDescription,
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
    const objectIds = { siteId, projectId, unitId, userId };
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

    const project = await Project.findById(projectId);
    if (!project) return sendError(res, "Project not found", 404);

    const unit = await Unit.findById(unitId);
    if (!unit) return sendError(res, "Unit not found", 404);

    // 🔹 Hierarchy validation
    if (String(project.siteId) !== String(site._id)) {
      return sendError(
        res,
        "Project does not belong to the specified Site",
        400
      );
    }

    if (
      String(unit.siteId) !== String(site._id) ||
      String(unit.projectId) !== String(project._id)
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
      action, // "review", "raiseMaterialDemand", "resolve", "verifyResolution", "repush"
      userId,
      userRole,
      comment,
      supervisorDetails, // { supervisorId, comments, images }
      materialDemand, // { materialName, quantity, reason, images }
      resolution, // { resolvedBy, images, remarks }
      closedBy, // userId (customer confirmation)
      closedImages = [],
      repushedDetails, // { count, reason }
    } = req.body;

    // 🔹 Validate params
    if (!id) return sendError(res, "Complaint ID is required", 400);
    // if (!userId) return sendError(res, "User ID is required", 400);
    if (!userRole) return sendError(res, "User role is required", 400);
    if (!action) return sendError(res, "Action is required", 400);

    const complaint = await Complaint.findById(id);
    if (!complaint) return sendError(res, "Complaint not found", 404);

    let newStatus = null;
    const newHistoryEntry = {
      updatedBy: userId,
      updatedByRole: userRole,
      comment: comment || "",
      updatedAt: new Date(),
    };

    // 🔁 Handle actions
    switch (action) {
      /**
       * 🧰 SUPERVISOR REVIEW STAGE
       */
      case "review":
        newStatus = "Under Review";
        newHistoryEntry.status = "Under Review";

        // 🔹 Validate supervisor details
        if (userRole !== "Admin") {
          if (!supervisorDetails?.supervisorId) {
            return sendError(res, "Supervisor ID is required", 400);
          }

          // 🧾 Check if supervisor exists
          const supervisor = await Supervisor.findById(
            supervisorDetails.supervisorId
          );
          if (!supervisor) {
            return sendError(res, "Supervisor not found", 404);
          }

          // // 🧩 Check if supervisor is assigned to this unit
          // if (
          //   supervisor.unitId &&
          //   String(supervisor.unitId) !== String(complaint.unitId)
          // ) {
          //   return sendError(
          //     res,
          //     "Supervisor is not assigned to this complaint’s unit",
          //     400
          //   );
          // }

          newHistoryEntry.supervisorDetails = {
            supervisorId: supervisor._id,
            comments: supervisorDetails.comments || "",
            images: supervisorDetails.images || [],
          };
        } else {
          // Admin can skip supervisor assignment
          newHistoryEntry.supervisorDetails = {
            supervisorId: null,
            comments: supervisorDetails?.comments || "Reviewed by Admin",
            images: supervisorDetails?.images || [],
          };
        }
        break;

      /**
       * 🏗️ MATERIAL DEMAND STAGE
       */
      case "raiseMaterialDemand":
        if (!materialDemand)
          return sendError(res, "Material demand details required", 400);
        newStatus = "Material Demand Raised";
        newHistoryEntry.status = "Material Demand Raised";
        newHistoryEntry.materialDemand = materialDemand;
        break;

      /**
       * 🧰 RESOLUTION STAGE
       */
      case "resolve":
        if (!resolution)
          return sendError(res, "Resolution details required", 400);
        newStatus = "Resolved";
        newHistoryEntry.status = "Resolved";
        newHistoryEntry.resolution = resolution;
        break;

      /**
       * ✅ CLOSURE STAGE (Customer verification)
       */
      case "verifyResolution":
        if (!closedBy)
          return sendError(
            res,
            "Customer (closedBy) required for closure",
            400
          );
        newStatus = "Closed";
        newHistoryEntry.status = "Closed";
        newHistoryEntry.closedBy = closedBy;
        newHistoryEntry.closedImages = closedImages;
        break;

      /**
       * 🔁 REPUSH STAGE (Customer not satisfied)
       */
      case "repush":
        newStatus = "Repushed";
        newHistoryEntry.status = "Repushed";
        newHistoryEntry.repushedDetails = repushedDetails || {
          count: (complaint.repushedDetails?.count || 0) + 1,
          reason: comment || "Repushed by user",
          repushedAt: new Date(),
        };
        break;

      default:
        return sendError(res, "Invalid action type", 400);
    }

    // 🔹 Apply update
    complaint.status = newStatus;
    complaint.statusHistory.push(newHistoryEntry);

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
      isPagination = "true",
      page = 1,
      limit = 10,
    } = req.query;

    const match = {};

    if (status) match.status = status;
    if (siteId) match.siteId = siteId;
    if (projectId) match.projectId = projectId;
    if (addedBy) match.addedBy = addedBy;

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
      .populate("projectId", "projectName")
      .populate("unitId", "unitType unitNumber")
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
      return sendError(res, "Please provide either userId or complaintId", 400);

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
        .populate("projectId", "projectName")
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
      .populate("projectId", "projectName")
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
        404
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
