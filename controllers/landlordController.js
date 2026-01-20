import Landlord from "../models/LandLord.modal.js";
import User from "../models/User.modal.js";

import Unit from "../models/masters/Unit.modal.js";
import mongoose from "mongoose";
import { sendError, sendSuccess } from "../utils/responseHandler.js";
import { register } from "./authControllers.js";
import { createUser } from "../utils/createUser.js";
import PaymentLedger from "../models/paymentLedger.modal.js";

export const addLandlord = async (req, res) => {
  try {
    const {
      name,
      fatherOrSpouseName,
      gender,
      dob,
      phone,
      alternateMobileNumber,
      email,
      address,
      coorespondenceAddress,
      profilePic,
      idProof,
      siteId,
      unitIds = [],
      propertyDetails,
      bankDetails,
      emergencyContactName,
      emergencyContactNumber,
      notes,
      walletBalance = 0,
      creditLimit = 0,
      isActive = true,
      ownershipstartDate,
      ownershipEndDate,
      meterId,
      customerId,
      meterSerialNumber,
      openingBalance,
      purpose,
      typePurpose,
    } = req.body;

    // -----------------------------
    // 🔴 BASIC REQUIRED VALIDATION
    // -----------------------------
    const missingFields = [];
    if (!name) missingFields.push("name");
    if (!phone) missingFields.push("phone");
    if (!siteId) missingFields.push("siteId");
    if (!unitIds || unitIds.length === 0) missingFields.push("unitIds");

    if (missingFields.length) {
      return sendError(
        res,
        `Missing required field(s): ${missingFields.join(", ")}`,
        400,
      );
    }

    // -----------------------------
    // 📱 PHONE / EMAIL FORMAT CHECK
    // -----------------------------
    // if (!/^[6-9]\d{9}$/.test(phone)) {
    //   return sendError(res, "Invalid phone number format", 400);
    // }

    // if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    //   return sendError(res, "Invalid email format", 400);
    // }

    // -----------------------------
    // 🔍 DUPLICATE CHECK — LANDLORD
    // -----------------------------
    const existingLandlord = await Landlord.findOne({
      isActive: true,
      $or: [{ phone }, ...(email ? [{ email }] : [])],
    });

    if (existingLandlord) {
      return sendError(
        res,
        "Active landlord with this phone or email already exists",
        409,
      );
    }

    // -----------------------------
    // 🔍 DUPLICATE CHECK — USER
    // -----------------------------
    const existingUser = await User.findOne({
      $or: [{ phone }, ...(email ? [{ email }] : [])],
    });

    if (existingUser) {
      return sendError(
        res,
        "User with this phone or email already exists",
        409,
      );
    }

    // -----------------------------
    // 🏘️ UNIT VALIDATION
    // -----------------------------
    const uniqueUnitIds = [...new Set(unitIds.map((id) => id.toString()))];
    if (uniqueUnitIds.length !== unitIds.length) {
      return sendError(res, "Duplicate unitIds are not allowed", 400);
    }

    const unitsCount = await Unit.countDocuments({ _id: { $in: unitIds } });
    if (unitsCount !== unitIds.length) {
      return sendError(res, "One or more units do not exist", 400);
    }

    // -----------------------------
    // 💰 OPENING BALANCE VALIDATION
    // -----------------------------
    if (openingBalance) {
      if (
        typeof openingBalance.amount !== "number" ||
        openingBalance.amount < 0
      ) {
        return sendError(res, "Invalid opening balance amount", 400);
      }

      if (
        openingBalance.type &&
        !["Debit", "Credit"].includes(openingBalance.type)
      ) {
        return sendError(
          res,
          "Opening balance type must be Debit or Credit",
          400,
        );
      }
    }

    // -----------------------------
    // 🏗️ CREATE LANDLORD
    // -----------------------------
    const landlord = await Landlord.create({
      name,
      fatherOrSpouseName,
      gender,
      dob,
      phone,
      alternateMobileNumber,
      email,
      address,
      coorespondenceAddress,
      profilePic,
      idProof,
      siteId,
      unitIds,
      propertyDetails,
      bankDetails,
      emergencyContactName,
      emergencyContactNumber,
      notes,
      walletBalance,
      creditLimit,
      isActive,
      ownershipstartDate,
      ownershipEndDate,
      createdBy: req.user?._id || null,
      meterId,
      customerId,
      meterSerialNumber,
      openingBalance,
      purpose,
    });

    // -----------------------------
    // 🔄 UPDATE UNITS & HISTORY
    // -----------------------------
    for (const unitId of unitIds) {
      const unit = await Unit.findById(unitId).populate("landlordId");
      if (!unit) continue;

      if (unit.landlordId && unit.landlordId.isActive) {
        const previousLandlord = unit.landlordId;

        const lastActive = unit.landlordHistory
          ?.slice()
          .reverse()
          .find(
            (h) =>
              h.landlordId?.toString() === previousLandlord._id.toString() &&
              h.isActive &&
              !h.endDate,
          );

        if (lastActive) {
          lastActive.isActive = false;
          lastActive.endDate = new Date();
        }

        await Landlord.findByIdAndUpdate(previousLandlord._id, {
          $set: { isActive: false },
        });
      }

      unit.landlordId = landlord._id;
      unit.landlordHistory.push({
        landlordId: landlord._id,
        startDate: new Date(),
        isActive: true,
      });

      await unit.save();
    }

    // -----------------------------
    // 👤 CREATE USER
    // -----------------------------
    const password = `${landlord.name.substring(0, 3).toLowerCase()}@123`;

    const createdUser = await createUser({
      name: landlord.name,
      email: landlord.email,
      phone: landlord.phone,
      password,
      role: "landlord",
      referenceId: landlord._id,
      siteId,
      unitId: unitIds[0],
    });

    landlord.userId = createdUser._id;
    await landlord.save();

    // -----------------------------
    // 📒 OPENING BALANCE LEDGER
    // -----------------------------
    if (
      openingBalance &&
      openingBalance.amount > 0 &&
      ["Debit", "Credit"].includes(openingBalance.type)
    ) {
      const lastEntry = await PaymentLedger.findOne({
        landlordId: landlord._id,
        siteId,
        unitId: unitIds[0],
      }).sort({ entryDate: -1 });

      const previousBalance = lastEntry?.closingBalance || 0;

      const isDebit = openingBalance.type === "Debit";
      const debitAmount = isDebit ? openingBalance.amount : 0;
      const creditAmount = !isDebit ? openingBalance.amount : 0;

      const closingBalance = isDebit
        ? previousBalance - debitAmount
        : previousBalance + creditAmount;

      await PaymentLedger.create({
        landlordId: landlord._id,
        siteId,
        unitId: unitIds[0],
        remark: typePurpose || "",
        entryType: openingBalance.type,
        debitAmount,
        creditAmount,
        openingBalance: previousBalance,
        closingBalance,
        entryDate: new Date(),
      });
    }

    return sendSuccess(res, "Landlord added successfully", landlord, 201);
  } catch (err) {
    console.error("Add Landlord Error:", err);
    return sendError(res, "Server error", 500, err.message);
  }
};

export const getLandlords = async (req, res) => {
  try {
    const {
      search,
      siteId,
      projectId,
      unitId,
      isActive,
      fromDate,
      toDate,
      order = "desc",
      page = 1,
      limit = 10,
      isPagination = "true", // ✅ default true
    } = req.query;

    const query = {};

    // ✅ Handle null/undefined safely
    if (siteId && siteId !== "null" && siteId !== "undefined")
      query.siteId = siteId;

    if (projectId && projectId !== "null" && projectId !== "undefined")
      query.projectId = projectId;

    if (isActive !== undefined) query.isActive = isActive === "true";

    // 🔍 Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // 🔍 Filter by unitId
    if (unitId && unitId !== "null" && unitId !== "undefined") {
      query.unitIds = { $in: [new mongoose.Types.ObjectId(unitId)] };
    }

    // 📅 Date range filter
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endOfDay;
      }
    }

    // 🧾 Sorting
    const sortOrder = order === "asc" ? 1 : -1;

    // ✅ Base query
    let landlordQuery = Landlord.find(query)
      .populate("siteId unitIds")
      .sort({ createdAt: sortOrder });

    // ✅ Apply pagination only if isPagination === "true"
    if (isPagination === "true") {
      landlordQuery = landlordQuery
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));
    }

    const landlords = await landlordQuery;
    const total = await Landlord.countDocuments(query);

    return sendSuccess(
      res,
      landlords.length
        ? "Landlords fetched successfully."
        : "No landlords found.",
      {
        data: landlords,
        total,
        page: isPagination === "true" ? Number(page) : null,
        limit: isPagination === "true" ? Number(limit) : null,
      },
      200,
    );
  } catch (err) {
    console.error("Get Landlords Error:", err);
    return sendError(res, "Server Error", 500, err.message);
  }
};

export const updateLandlordStatus = async (req, res) => {
  try {
    const { landlordId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return sendError(res, "isActive must be true or false.", 400);
    }

    const landlord = await Landlord.findById(landlordId).populate("unitIds");
    if (!landlord) return sendError(res, "Landlord not found", 404);

    const siteId = landlord.siteId;
    const unitIds = landlord.unitIds; // This is an array of unit IDs

    if (!siteId || unitIds.length === 0) {
      return sendError(res, "Landlord must have siteId and unitIds", 400);
    }

    // =============================
    // 1️⃣ If activating this landlord
    // =============================
    if (isActive === true) {
      // ❗ Make all landlords inactive for same site + same units
      await Landlord.updateMany(
        {
          siteId,
          unitIds: { $in: unitIds },
          _id: { $ne: landlordId },
        },
        { $set: { isActive: false } },
      );

      // Activate current landlord
      landlord.isActive = true;
      await landlord.save();

      // Update unit history also
      for (const unit of unitIds) {
        const unitData = await Unit.findById(unit);

        if (!unitData) continue;

        // Inactivate all history
        unitData.landlordHistory.forEach((h) => (h.isActive = false));

        // Add new active history
        unitData.landlordHistory.push({
          landlordId: landlord._id,
          startDate: new Date(),
          isActive: true,
        });

        // Assign landlord to unit
        unitData.landlordId = landlord._id;

        await unitData.save();
      }

      return sendSuccess(res, "Landlord activated successfully", landlord);
    }

    // =============================
    // 2️⃣ If deactivating this landlord
    // =============================
    landlord.isActive = false;
    await landlord.save();

    // Optional: Update unit history
    for (const unit of unitIds) {
      const unitData = await Unit.findById(unit);
      if (!unitData) continue;

      // update history
      const activeEntry = unitData.landlordHistory.find(
        (h) => h.landlordId.toString() === landlordId && h.isActive === true,
      );

      if (activeEntry) {
        activeEntry.isActive = false;
        activeEntry.endDate = new Date();
      }

      await unitData.save();
    }

    return sendSuccess(res, "Landlord deactivated successfully", landlord);
  } catch (error) {
    console.error(error);
    return sendError(res, "Server Error", 500, error.message);
  }
};

export const getLandlordById = async (req, res) => {
  if (req?.params?.id === undefined || req?.params?.id === null) {
    return sendError(
      res,
      "Landlord ID is required",
      400,
      "Landlord ID is missing",
    );
  }
  try {
    const landlord = await Landlord.findById(req.params.id).populate(
      "siteId unitIds",
    );
    if (!landlord) return sendError(res, "Landlord not found.", 404);

    return sendSuccess(res, "Landlord fetched successfully.", landlord);
  } catch (err) {
    console.error("Get Landlord Error:", err);
    return sendError(res, "Server Error", 500, err.message);
  }
};

export const updateLandlord = async (req, res) => {
  if (!req?.params?.id) {
    return sendError(
      res,
      "Landlord ID is required",
      400,
      "Landlord ID is missing",
    );
  }

  if (Object.keys(req.body).length === 0) {
    return sendError(res, "No data provided for update", 400, "Empty body");
  }

  try {
    const landlordId = req.params.id;
    let updates = { ...req.body };

    // ⛔ Skip isActive even if user sends it
    if (updates.hasOwnProperty("isActive")) {
      delete updates.isActive;
    }

    const landlord = await Landlord.findById(landlordId);
    if (!landlord) return sendError(res, "Landlord not found.", 404);

    // 🟢 Only update allowed fields (except isActive)
    const updatedLandlord = await Landlord.findByIdAndUpdate(
      landlordId,
      updates,
      { new: true },
    );

    return sendSuccess(
      res,
      "Landlord updated successfully.",
      updatedLandlord,
      200,
    );
  } catch (err) {
    console.error("Update Landlord Error:", err);
    return sendError(res, "Server Error", 500, err.message);
  }
};

export const deleteLandlord = async (req, res) => {
  if (req?.params?.id === undefined || req?.params?.id === null) {
    return sendError(
      res,
      "Landlord ID is required",
      400,
      "Landlord ID is missing",
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
            !h.endDate,
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
