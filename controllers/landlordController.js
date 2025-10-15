import Landlord from "../models/LandLord.modal.js";
import Unit from "../models/masters/Unit.modal.js";
import mongoose from "mongoose";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

// 🟢 Add Landlord
export const addLandlord = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      address,
      profilePic,
      siteId,
      projectId,
      unitIds,
    } = req.body;

    // 🧩 Detailed field validation
    if (!name || !phone || !siteId || !projectId || unitIds.lenght === 0) {
      const missingFields = [];
      if (!name) missingFields.push("name");
      if (!phone) missingFields.push("phone");
      if (!siteId) missingFields.push("siteId");
      if (!projectId) missingFields.push("projectId");
      if (unitIds.lenght === 0) missingFields.push("unitIds");

      return sendError(
        res,
        `Missing required field(s): ${missingFields.join(", ")}.`,
        { missingFields },
        400
      );
    }

    // Check duplicate phone
    const existing = await Landlord.findOne({ phone, isActive: true });
    if (existing)
      return sendError(res, "Landlord with this phone already exists.", 400);

    const landlord = await Landlord.create({
      name,
      phone,
      email,
      address,
      profilePic,
      siteId,
      projectId,
      unitIds,
      createdBy: req.user?._id || null,
    });

    // Link landlordId in Unit(s)
    if (Array.isArray(unitIds)) {
      await Unit.updateMany(
        { _id: { $in: unitIds } },
        { $set: { landlordId: landlord._id } }
      );
    }

    return sendSuccess(res, "Landlord added successfully.", landlord, 201);
  } catch (err) {
    console.error("Add Landlord Error:", err);
    return sendError(res, "Server Error", 500, err.message);
  }
};

// 🟡 Get Landlords (with filters + pagination)
export const getLandlords = async (req, res) => {
  try {
    const {
      search,
      siteId,
      projectId,
      unitId,
      isActive,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};
    if (siteId) query.siteId = siteId;
    if (projectId) query.projectId = projectId;
    if (isActive !== undefined) query.isActive = isActive === "true";
    if (search)
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    // 🔍 Filter by specific unitId
    if (unitId) query.unitIds = { $in: [new mongoose.Types.ObjectId(unitId)] };
    const landlords = await Landlord.find(query)
      .populate("siteId projectId unitIds")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Landlord.countDocuments(query);

    return sendSuccess(
      res,
      "Landlords fetched successfully.",
      {
        total,
        page: Number(page),
        limit: Number(limit),
        data: landlords,
      },
      200
    );
  } catch (err) {
    console.error("Get Landlords Error:", err);
    return sendError(res, "Server Error", 500, err.message);
  }
};

// 🟢 Get single Landlord
export const getLandlordById = async (req, res) => {
  try {
    const landlord = await Landlord.findById(req.params.id).populate(
      "siteId projectId unitIds"
    );
    if (!landlord) return sendError(res, "Landlord not found.", 404);

    return sendSuccess(res, "Landlord fetched successfully.", landlord);
  } catch (err) {
    console.error("Get Landlord Error:", err);
    return sendError(res, "Server Error", 500, err.message);
  }
};

// 🟠 Update Landlord
export const updateLandlord = async (req, res) => {
    if (req?.params?.id === undefined || req?.params?.id === null) {
      return sendError(
        res,
        "Landlord ID is required",
        400,
        "Landlord ID is missing"
      );
    }
  if (Object.keys(req.body).length === 0) {
    return sendError(res, "No data provided for update", 400, "Empty body");
  }
  try {
    const updates = req.body;
    const landlord = await Landlord.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });

    if (!landlord) return sendError(res, "Landlord not found.", 404);

    return sendSuccess(res, "Landlord updated successfully.", landlord, 200);
  } catch (err) {
    console.error("Update Landlord Error:", err);
    return sendError(res, "Server Error", 500, err.message);
  }
};

// 🔴 Delete / Archive Landlord
export const deleteLandlord = async (req, res) => {
  try {
    const landlord = await Landlord.findById(req.params.id);
    if (!landlord) return sendError(res, "Landlord not found.", 404);

    landlord.isActive = false;
    landlord.ownershipEndDate = new Date();
    await landlord.save();

    return sendSuccess(res, "Landlord archived successfully.", null, 200);
  } catch (err) {
    console.error("Delete Landlord Error:", err);
    return sendError(res, "Server Error", 500, err.message);
  }
};
