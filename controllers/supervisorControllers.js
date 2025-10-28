import express from "express";
import Supervisor from "../models/Supervisors.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";
import { createUser } from "../utils/createUser.js";

const router = express.Router();

const validateVerificationDocs = (docs) => {
  if (!Array.isArray(docs)) return false;
  for (const doc of docs) {
    if (!doc.type || !["Aadhar", "PAN", "Other"].includes(doc.type))
      return false;
    if (!doc.number || typeof doc.number !== "string") return false;
    if (doc.fileUrl && typeof doc.fileUrl !== "string") return false;
  }
  return true;
};

// ➤ Create Supervisor + User
export const createSupervisor = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      verificationDocuments,
      siteId,
      projectId,
      unitId, // single unit
      isActive = true,
    } = req.body;

    // Manual validations
    if (!name || typeof name !== "string")
      return sendError(res, "Name is required", 400);
    if (!phone || typeof phone !== "string")
      return sendError(res, "Phone is required", 400);
    if (email && typeof email !== "string")
      return sendError(res, "Email must be a string", 400);
    if (!siteId) return sendError(res, "siteId is required", 400);
    if (!projectId) return sendError(res, "projectId is required", 400);
    if (!unitId) return sendError(res, "unitId is required", 400);
    if (
      !verificationDocuments ||
      !Array.isArray(verificationDocuments) ||
      verificationDocuments.length === 0
    ) {
      return sendError(
        res,
        "At least one verification document is required",
        400
      );
    }

    // 1️⃣ Create Supervisor document first
    const supervisor = new Supervisor({
      name,
      phone,
      email,
      verificationDocuments,
      siteId,
      projectId,
      unitId, // single unit
      isActive,
    });
    await supervisor.save();

    // 2️⃣ Create User account for Supervisor
    const userPayload = {
      name,
      email,
      phone,
      role: "supervisor",
      referenceId: supervisor._id,
      password: "ABC123",
      siteId,
      projectId,
      unitId, // single unit
    };

    const user = await createUser(userPayload); // helper should return created user document

    // 3️⃣ Update Supervisor with userId
    supervisor.userId = user._id;
    await supervisor.save();

    return sendSuccess(
      res,
      "Supervisor created successfully with user account",
      supervisor,
      200
    );
  } catch (err) {
    return sendError(res, "Server error", 500, err.message);
  }
};

export const getSupervisors = async (req, res) => {
  try {
    const {
      siteId,
      projectId,
      unitId,
      name,
      phone,
      isActive,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
      isPagination = "true", // new param
    } = req.query;

    const filters = {};

    if (siteId) filters.siteId = siteId;
    if (projectId) filters.projectId = projectId;
    if (unitId) filters.unitId = unitId; // checks if unitId exists in array
    if (name) filters.name = { $regex: name, $options: "i" };
    if (phone) filters.phone = { $regex: phone, $options: "i" };
    if (isActive !== undefined) filters.isActive = isActive === "true";

    const sortOrder = order === "asc" ? 1 : -1;

    let supervisors, total;

    if (isPagination === "true") {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      total = await Supervisor.countDocuments(filters);
      supervisors = await Supervisor.find(filters)
        .populate("siteId") // 👈 populate siteId
        .populate("projectId") // 👈 populate projectId
        .populate("unitId")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit));

      return sendSuccess(
        res,
        "Supervisors fetched successfully",
        {
          supervisors,
          total,
          page: parseInt(page),
          limit: parseInt(limit),
        },
        200
      );
    } else {
      supervisors = await Supervisor.find(filters)
        .populate("siteId")
        .populate("projectId")
        .populate("unitId")
        .sort({
          [sortBy]: sortOrder,
        });
      total = supervisors.length;
      return sendSuccess(
        res,
        "Supervisors fetched successfully",
        {
          total,
          supervisors,
        },
        400
      );
    }
  } catch (err) {
    return sendError(res, err.message);
  }
};

// ➤ Get Supervisor by ID
export const getSupervisorById = async (req, res) => {
  if (req?.params?.id) {
    return sendError(res, "Id not found/Invalid", 404, "Id not found/Invalid");
  }
  try {
    const supervisor = await Supervisor.findById(req.params.id);
    if (!supervisor) return sendError(res, "Supervisor not found", 404);
    return sendSuccess(res, supervisor);
  } catch (err) {
    return sendError(res, err.message);
  }
};

// ➤ Update Supervisor
export const updateSupervisor = async (req, res) => {
  if (req?.params?.id) {
    return sendError(res, "Id not found/Invalid", 404, "Id not found/Invalid");
  }
  if (Object.keys(req.body).length === 0) {
    return sendError(res, "No data provided for update", 400, "Empty body");
  }
  try {
    const supervisor = await Supervisor.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      }
    );
    if (!supervisor) return sendError(res, "Supervisor not found", 404);
    return sendSuccess(res, supervisor, "Supervisor updated successfully");
  } catch (err) {
    return sendError(res, err.message);
  }
};

// ➤ Delete Supervisor
export const deleteSupervisor = async (req, res) => {
  if (req?.params?.id) {
    return sendError(res, "Id not found/Invalid", 404, "Id not found/Invalid");
  }
  try {
    const supervisor = await Supervisor.findByIdAndDelete(req.params.id);
    if (!supervisor) return sendError(res, "Supervisor not found", 404);
    return sendSuccess(res, supervisor, "Supervisor deleted successfully");
  } catch (err) {
    return sendError(res, err.message);
  }
};

export default router;
