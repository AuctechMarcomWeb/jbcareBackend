import Complaint from "../models/Complaints.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

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
    } = req.body;

    if (!complaintTitle || complaintTitle.trim() === "") {
      return sendError(res, "Complaint title is required", 400);
    }

    if (!complaintDescription || complaintDescription.trim() === "") {
      return sendError(res, "Complaint description is required", 400);
    }

    const complaint = await Complaint.create({
      siteId,
      projectId,
      unitId,
      userId,
      complaintTitle,
      complaintDescription,
      images,
    });

    return sendSuccess(res, "Complaint submitted successfully", complaint, 201);
  } catch (error) {
    return sendError(res, "Failed to create complaint", 500, error.message);
  }
};

// SUPERVISOR - Review complaint
export const reviewComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, supervisorComments, supervisorImages } = req.body;

    const complaint = await Complaint.findByIdAndUpdate(
      id,
      {
        status: status || "Under Review",
        supervisorId: req.user.id,
        supervisorComments,
        supervisorImages,
        verifiedAt: new Date(),
      },
      { new: true }
    );

    if (!complaint) return sendError(res, "Complaint not found", 404);

    return sendSuccess(res, "Complaint reviewed successfully", complaint, 200);
  } catch (error) {
    return sendError(res, "Failed to review complaint", 500, error.message);
  }
};

// SUPERVISOR or ADMIN - Mark as resolved
export const resolveComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolvedImages } = req.body;

    const complaint = await Complaint.findByIdAndUpdate(
      id,
      {
        status: "Resolved",
        resolvedBy: req.user.id,
        resolvedImages,
        resolvedAt: new Date(),
      },
      { new: true }
    );

    if (!complaint) return sendError(res, "Complaint not found", 404);

    return sendSuccess(res, "Complaint marked as resolved", complaint, 200);
  } catch (error) {
    return sendError(res, "Failed to resolve complaint", 500, error.message);
  }
};

// ADMIN - Get all complaints with filters & pagination
export const getAllComplaints = async (req, res) => {
  try {
    const {
      search,
      fromDate,
      toDate,
      status,
      isPagination = "true",
      page = 1,
      limit = 10,
    } = req.query;

    const match = {};

    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      match.$or = [
        { complaintTitle: { $regex: regex } },
        { complaintDescription: { $regex: regex } },
      ];
    }

    if (status) {
      match.status = status;
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
      .populate("userId", "name email")
      .populate("supervisorId", "name email")
      .populate("resolvedBy", "name email")
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
