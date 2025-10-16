import Landlord from "../models/LandLord.modal.js";
import Unit from "../models/masters/Unit.modal.js";
import mongoose from "mongoose";
import { sendError, sendSuccess } from "../utils/responseHandler.js";
import { register } from "./authControllers.js";
import { createUser } from "../utils/createUser.js";

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
      unitIds = [],
    } = req.body;

    // 🧩 Validation
    if (!name || !phone || !siteId || !projectId || unitIds.length === 0) {
      const missingFields = [];
      if (!name) missingFields.push("name");
      if (!phone) missingFields.push("phone");
      if (!siteId) missingFields.push("siteId");
      if (!projectId) missingFields.push("projectId");
      if (unitIds.length === 0) missingFields.push("unitIds");

      return sendError(
        res,
        `Missing required field(s): ${missingFields.join(", ")}.`,
        400,
        { missingFields }
      );
    }

    // 🧠 Check for duplicate active phone
    const existing = await Landlord.findOne({ phone, isActive: true });
    if (existing)
      return sendError(res, "Landlord with this phone already exists.", 400);

    // 🏗️ Create new active landlord
    const landlord = await Landlord.create({
      name,
      phone,
      email,
      address,
      profilePic,
      siteId,
      projectId,
      unitIds,
      isActive: true,
      createdBy: req.user?._id || null,
    });

    // 🔄 Update each linked unit
    for (const unitId of unitIds) {
      const unit = await Unit.findById(unitId).populate("landlordId");
      if (!unit) continue;

      // 🏘️ If a previous landlord exists
      if (unit.landlordId && unit.landlordId.isActive) {
        const previousLandlord = unit.landlordId;

        // ✅ Close any previous active record
        const lastActive = unit.landlordHistory
          .slice()
          .reverse()
          .find(
            (h) =>
              h.landlordId?.toString?.() === previousLandlord._id.toString() &&
              h.isActive === true &&
              !h.endDate
          );

        if (lastActive) {
          lastActive.isActive = false;
          lastActive.endDate = new Date();
        } else {
          unit.landlordHistory.push({
            landlordId: previousLandlord._id,
            startDate: previousLandlord.createdAt,
            endDate: new Date(),
            isActive: false,
          });
        }

        // ❌ Deactivate previous landlord globally
        await Landlord.findByIdAndUpdate(previousLandlord._id, {
          $set: { isActive: false },
        });
      }

      // ✅ Assign new landlord
      unit.landlordId = landlord._id;

      // 🔹 Add new active record if not already present
      const lastRecord = unit.landlordHistory[unit.landlordHistory.length - 1];
      if (
        !lastRecord ||
        lastRecord.landlordId?.toString() !== landlord._id.toString() ||
        lastRecord.isActive === false
      ) {
        unit.landlordHistory.push({
          landlordId: landlord._id,
          startDate: new Date(),
          isActive: true,
        });
      }

      await unit.save();
    }
    await createUser({
      name: landlord?.name,
      email: landlord?.email,
      phone: landlord?.phone,
      password: `Abc@123`,
      role: "landlord",
      referenceId: landlord?._id,
    });

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

    if (landlords.length === 0) {
      return sendSuccess(
        res,
        "No landlords found.",
        {
          data: [],
          total: 0,
          page: Number(page),
          limit: Number(limit),
        },
        200
      );
    }

    const total = await Landlord.countDocuments(query);

    return sendSuccess(
      res,
      "Landlords fetched successfully.",
      {
        data: landlords,
        total,
        page: Number(page),
        limit: Number(limit),
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
  if (req?.params?.id === undefined || req?.params?.id === null) {
    return sendError(
      res,
      "Landlord ID is required",
      400,
      "Landlord ID is missing"
    );
  }
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

// 🟡 Update Landlord
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
    const landlordId = req.params.id;
    const updates = req.body;

    const landlord = await Landlord.findById(landlordId);
    if (!landlord) return sendError(res, "Landlord not found.", 404);

    // 🧩 Handle activation/deactivation
    if (updates.hasOwnProperty("isActive")) {
      for (const unitId of landlord.unitIds) {
        const unit = await Unit.findById(unitId);
        if (!unit) continue;

        if (updates.isActive === false) {
          // ✅ Close any active record for this landlord
          const lastActive = unit.landlordHistory
            .slice()
            .reverse()
            .find(
              (h) =>
                h.landlordId?.toString?.() === landlord._id.toString() &&
                h.isActive === true &&
                !h.endDate
            );

          if (lastActive) {
            lastActive.isActive = false;
            lastActive.endDate = new Date();
          } else {
            unit.landlordHistory.push({
              landlordId: landlord._id,
              startDate: landlord.createdAt,
              endDate: new Date(),
              isActive: false,
            });
          }

          unit.landlordId = null;
          await unit.save();
        } else if (updates.isActive === true) {
          // Close previous landlord record if another active one exists
          if (unit.landlordId && unit.landlordId.toString() !== landlordId) {
            const prevId = unit.landlordId;
            const lastPrev = unit.landlordHistory
              .slice()
              .reverse()
              .find(
                (h) =>
                  h.landlordId?.toString?.() === prevId.toString() &&
                  h.isActive === true &&
                  !h.endDate
              );
            if (lastPrev) {
              lastPrev.isActive = false;
              lastPrev.endDate = new Date();
            }
          }

          // ✅ Assign this landlord
          unit.landlordId = landlord._id;

          // Add new active record if needed
          const lastRecord =
            unit.landlordHistory[unit.landlordHistory.length - 1];
          if (
            !lastRecord ||
            lastRecord.landlordId?.toString() !== landlord._id.toString() ||
            lastRecord.isActive === false
          ) {
            unit.landlordHistory.push({
              landlordId: landlord._id,
              startDate: new Date(),
              isActive: true,
            });
          }

          await unit.save();
        }
      }
    }

    // ✅ Update landlord
    const updatedLandlord = await Landlord.findByIdAndUpdate(
      landlordId,
      updates,
      { new: true }
    );

    return sendSuccess(
      res,
      "Landlord updated successfully.",
      updatedLandlord,
      200
    );
  } catch (err) {
    console.error("Update Landlord Error:", err);
    return sendError(res, "Server Error", 500, err.message);
  }
};

// 🔴 Delete / Archive Landlord
export const deleteLandlord = async (req, res) => {
  if (req?.params?.id === undefined || req?.params?.id === null) {
    return sendError(
      res,
      "Landlord ID is required",
      400,
      "Landlord ID is missing"
    );
  }

  try {
    const landlord = await Landlord.findById(req.params.id);
    if (!landlord) return sendError(res, "Landlord not found.", 404);

    landlord.isActive = false;
    landlord.ownershipEndDate = new Date();
    await landlord.save();

    // 🔄 Update linked units
    const units = await Unit.find({ landlordId: landlord._id });
    for (const unit of units) {
      // ✅ Close active history if open
      const lastActive = unit.landlordHistory
        .slice()
        .reverse()
        .find(
          (h) =>
            h.landlordId?.toString?.() === landlord._id.toString() &&
            h.isActive === true &&
            !h.endDate
        );

      if (lastActive) {
        lastActive.isActive = false;
        lastActive.endDate = new Date();
      } else {
        unit.landlordHistory.push({
          landlordId: landlord._id,
          startDate: landlord.createdAt,
          endDate: new Date(),
          isActive: false,
        });
      }

      unit.landlordId = null;
      await unit.save();
    }

    return sendSuccess(res, "Landlord archived successfully.", null, 200);
  } catch (err) {
    console.error("Delete Landlord Error:", err);
    return sendError(res, "Server Error", 500, err.message);
  }
};
