import express from "express";
import Supervisor from "../models/Supervisors.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";
import { createUser } from "../utils/createUser.js";
import mongoose from "mongoose";

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
      isActive = true,
    } = req.body;

    if (!name) return sendError(res, "Name is required", 400);
    if (!phone) return sendError(res, "Phone is required", 400);
    if (!siteId) return sendError(res, "siteId is required", 400);

    if (!verificationDocuments || !verificationDocuments.length)
      return sendError(
        res,
        "At least one verification document is required",
        400
      );

    // --------------------------------------
    // 🔥 Make ALL previous supervisors inactive for this site
    // --------------------------------------
    if (isActive === true) {
      await Supervisor.updateMany(
        { siteId, isActive: true },
        { $set: { isActive: false } }
      );
    }

    // --------------------------------------
    // 1️⃣ Create Supervisor
    // --------------------------------------
    const supervisor = new Supervisor({
      name,
      phone,
      email,
      verificationDocuments,
      siteId,
      isActive,
    });
    await supervisor.save();

    // --------------------------------------
    // 2️⃣ Create User
    // --------------------------------------
    const userPayload = {
      name,
      email,
      phone,
      role: "supervisor",
      referenceId: supervisor._id,
      password: "ABC123",
      siteId,
    };

    const user = await createUser(userPayload);

    // --------------------------------------
    // 3️⃣ Link userId → Supervisor
    // --------------------------------------
    supervisor.userId = user._id;
    await supervisor.save();

    return sendSuccess(res, "Supervisor created successfully", supervisor, 200);
  } catch (err) {
    console.error("Create Supervisor Error:", err);
    return sendError(res, "Server error", 500, err.message);
  }
};

export const getSupervisors = async (req, res) => {
  try {
    const {
      siteId,
      search,
      name,
      phone,
      isActive,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
      isPagination = "true",
    } = req.query;

    let match = {};

    // -----------------------------
    // 📌 Filter By siteId (ObjectId)
    // -----------------------------
    if (siteId && mongoose.Types.ObjectId.isValid(siteId)) {
      match.siteId = new mongoose.Types.ObjectId(siteId);
    }

    // -----------------------------
    // 📌 Filter By name only (specific)
    // -----------------------------
    if (name) {
      match.name = { $regex: name, $options: "i" };
    }

    // -----------------------------
    // 📌 Filter By phone
    // -----------------------------
    if (phone) {
      match.phone = { $regex: phone, $options: "i" };
    }

    // -----------------------------
    // 📌 Filter by active/inactive
    // -----------------------------
    if (isActive !== undefined) {
      match.isActive = isActive === "true" || isActive === "1";
    }

    // -----------------------------
    // 📌 GLOBAL SEARCH (name OR siteName)
    // -----------------------------
    let searchStage = {};
    if (search) {
      const regex = new RegExp(search, "i");
      searchStage = {
        $or: [
          { name: regex }, // supervisor name
          { "site.siteName": regex }, // site name
        ],
      };
    }

    // ----------------------------------------
    // 📌 AGGREGATION PIPELINE (needed for siteName search)
    // ----------------------------------------
    const pipeline = [
      { $match: match },

      // Join sites
      {
        $lookup: {
          from: "sites",
          localField: "siteId",
          foreignField: "_id",
          as: "site",
        },
      },
      { $unwind: { path: "$site", preserveNullAndEmptyArrays: true } },

      // Apply searchStage if search exists
      ...(search ? [{ $match: searchStage }] : []),

      // Sorting
      {
        $sort: { [sortBy]: order === "asc" ? 1 : -1 },
      },
    ];

    // ----------------------------------------
    // 📌 Pagination
    // ----------------------------------------
    let total = 0;
    let supervisors = [];

    if (isPagination === "true") {
      total = (await Supervisor.aggregate(pipeline)).length;

      pipeline.push(
        { $skip: (page - 1) * Number(limit) },
        { $limit: Number(limit) }
      );

      supervisors = await Supervisor.aggregate(pipeline);
    } else {
      supervisors = await Supervisor.aggregate(pipeline);
      total = supervisors.length;
    }

    return sendSuccess(res, "Supervisors fetched", {
      total,
      page: Number(page),
      limit: Number(limit),
      supervisors,
    });
  } catch (err) {
    console.error("❌ Error in getSupervisors:", err);
    return sendError(res, err.message || "Server Error");
  }
};

// ➤ Get Supervisor by ID
export const getSupervisorById = async (req, res) => {
  console.log("Supervisor id ==>", req?.params?.id);

  if (!req?.params?.id) {
    return sendError(res, "Id not found/Invalid", 404, "Id not found/Invalid");
  }
  try {
    const supervisor = await Supervisor.findById(req.params.id).populate(
      "siteId"
    ); // populate specific fields
    // .populate("projectId")
    // .populate("unitId");
    if (!supervisor) return sendError(res, "Supervisor not found", 404);
    return sendSuccess(res, "Fetched the supervisor by id", supervisor, 200);
  } catch (err) {
    return sendError(res, err.message, 500, err.message);
  }
};

export const updateSupervisor = async (req, res) => {
  try {
    const { supervisorId } = req.params;
    const updates = req.body;

    const supervisor = await Supervisor.findById(supervisorId);
    if (!supervisor) return sendError(res, "Supervisor not found", 404);

    const siteId = supervisor.siteId;

    // --------------------------------------
    // 🔥 If supervisor is becoming ACTIVE
    // --------------------------------------
    if (updates.isActive === true) {
      await Supervisor.updateMany(
        {
          siteId,
          _id: { $ne: supervisorId }, // exclude current supervisor
          isActive: true,
        },
        { $set: { isActive: false } }
      );
    }

    // --------------------------------------
    // 🔥 If inactive → no need to update others
    // --------------------------------------

    // Apply updates
    Object.assign(supervisor, updates);
    await supervisor.save();

    return sendSuccess(res, "Supervisor updated successfully", supervisor);
  } catch (err) {
    console.error("Update Supervisor Error:", err);
    return sendError(res, "Server error", 500, err.message);
  }
};

// ➤ Delete Supervisor
export const deleteSupervisor = async (req, res) => {
  if (!req?.params?.id) {
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
