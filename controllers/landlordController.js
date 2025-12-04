import Landlord from "../models/LandLord.modal.js";
import Unit from "../models/masters/Unit.modal.js";
import mongoose from "mongoose";
import { sendError, sendSuccess } from "../utils/responseHandler.js";
import { register } from "./authControllers.js";
import { createUser } from "../utils/createUser.js";
import Ledger from "../models/Ledger.modal.js";
import PaymentLedger from "../models/paymentLedger.modal.js";

// 🟢 Add Landlord
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
      idProof, // { type, number, documentUrl }
      siteId,
      unitIds = [],
      propertyDetails, // { propertyName, propertyType, propertyAddress, propertyDocumentsUrl }
      bankDetails, // { accountHolderName, bankName, accountNumber, ifscCode, branchAddress }
      emergencyContactName,
      emergencyContactNumber,
      notes,
      walletBalance = 0,
      isActive = true,
      ownershipstartDate,
      ownershipEndDate,
      meterId,
      customerId,
      meterSerialNumber,
      openingBalance,
      purpose,
      typePurpose
    } = req.body;

    // 🧩 Validation
    if (!name || !phone || !siteId || unitIds.length === 0) {
      const missingFields = [];
      if (!name) missingFields.push("name");
      if (!phone) missingFields.push("phone");
      if (!siteId) missingFields.push("siteId");
      // if (!projectId) missingFields.push("projectId");
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
      fatherOrSpouseName,
      gender,
      dob,
      phone,
      address,
      alternateMobileNumber,
      email,
      coorespondenceAddress,
      profilePic,
      idProof, // { type, number, documentUrl }
      siteId,
      unitIds,
      propertyDetails, // { propertyName, propertyType, propertyAddress, propertyDocumentsUrl }
      bankDetails, // { accountHolderName, bankName, accountNumber, ifscCode, branchAddress }
      emergencyContactName,
      emergencyContactNumber,
      notes,
      walletBalance,
      isActive,
      ownershipstartDate,
      ownershipEndDate,
      createdBy: req.user?._id || null,
      // 🆕 NEW ELECTRIC METER FIELDS
      meterId,
      customerId,
      meterSerialNumber,
      openingBalance,
      purpose,
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

    const createdUser = await createUser({
      name: landlord?.name,
      email: landlord?.email,
      phone: landlord?.phone,
      password: `Abc@123`,
      role: "landlord",
      referenceId: landlord?._id,
      siteId,
      unitId: unitIds[0] || null,
    });

    // 🔹 Save user ID back to landlord
    landlord.userId = createdUser._id;
    await landlord.save();
    if (
      openingBalance &&
      Number(openingBalance.amount) > 0 &&
      ["Debit", "Credit"].includes(openingBalance.type)
    ) {

      const landlordId = landlord._id

      console.log("landlord", landlord);

      const siteId = landlord.siteId
      const unitId = unitIds[0]

      const lastEntry = await PaymentLedger.findOne({
        landlordId,
        siteId,
        unitId,
      }).sort({ entryDate: -1 });

      console.log("openingBalance", openingBalance);

      const openingBalance1 = lastEntry ? lastEntry?.closingBalance : 0;


      const amount = openingBalance?.amount

      if (openingBalance.type == "Debit") {

        const entryType = "Debit";
        const debitAmount = amount;
        const creditAmount = 0;

        // closing balance decreases because it's debit
        const closingBalance = openingBalance1 - debitAmount;

        // ✔ Create Ledger Entry
        await PaymentLedger.create({
          landlordId,
          siteId,
          unitId,
          remark: typePurpose ? typePurpose : "",
          description: "",
          paymentMode: "",
          entryType,
          debitAmount,
          creditAmount,
          openingBalance: closingBalance,
          closingBalance,
          entryDate: new Date(),
        });

      } else {
        const entryType = "Credit";
        const debitAmount = 0;
        const creditAmount = amount;

        // closing balance decreases because it's debit
        const closingBalance = openingBalance1 + creditAmount;

        // ✔ Create Ledger Entry
        await PaymentLedger.create({
          landlordId,
          siteId,
          unitId,
          remark: typePurpose ? typePurpose : "",
          description: "",
          paymentMode: "",
          entryType,

          debitAmount,
          creditAmount,
          openingBalance: closingBalance,
          closingBalance,
          entryDate: new Date(),
        });
      }



      console.log("lastEntry", lastEntry);


      // const typePurpose =
      //   openingBalance.type === "Debit" ? "Due Amount" : "Advance Amount";
      // await Ledger.create({
      //   landlordId: landlord._id,
      //   billId: null, // Not linked to any bill
      //   siteId: landlord.siteId, // optional: remove if not needed
      //   unitId: unitIds[0], // optional: remove if not needed
      //   amount: openingBalance?.amount,
      //   type:
      //     openingBalance === "Credit"
      //       ? "CREDIT"
      //       : openingBalance === "Debit"
      //         ? "DEBIT"
      //         : null,
      //   purpose: `New Opening balance added - ${typePurpose}` || purpose,
      //   transactionType: "Opening Balance",
      //   openingBalance: {
      //     amount: openingBalance?.amount,
      //     type: openingBalance.type,
      //   },
      //   closingBalance: {
      //     amount: openingBalance?.amount,
      //     type: openingBalance.type,
      //   },
      // });
    }

    return sendSuccess(res, "Landlord added successfully.", landlord, 201);
  } catch (err) {
    console.error("Add Landlord Error:", err);
    return sendError(res, "Server Error", 500, err.message);
  }
};

// 🟡 Get Landlords (with filters + pagination + date range + latest first)
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
      order = "desc", // 🔹 optional: "asc" or "desc"
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // ✅ Handle null/undefined safely
    if (siteId && siteId !== "null" && siteId !== "undefined")
      query.siteId = siteId;
    if (projectId && projectId !== "null" && projectId !== "undefined")
      query.projectId = projectId;

    if (isActive !== undefined) query.isActive = isActive === "true";

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // 🔍 Filter by specific unitId
    if (unitId && unitId !== "null" && unitId !== "undefined") {
      query.unitIds = { $in: [new mongoose.Types.ObjectId(unitId)] };
    }

    // 📅 Filter by Date Range (createdAt)
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        // Include entire day till 23:59:59
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endOfDay;
      }
    }

    // 🧾 Sort order (latest first by default)
    const sortOrder = order === "asc" ? 1 : -1;

    const landlords = await Landlord.find(query)
      .populate("siteId unitIds")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: sortOrder });

    const total = await Landlord.countDocuments(query);

    return sendSuccess(
      res,
      landlords.length
        ? "Landlords fetched successfully."
        : "No landlords found.",
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
      "siteId unitIds"
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
      // If setting this landlord active
      if (updates.isActive === true) {
        // 🔥 Step 1 — Deactivate ALL other landlords
        await Landlord.updateMany(
          { _id: { $ne: landlordId } },
          { isActive: false }
        );

        // 🔥 Step 2 — Remove landlordId from all units
        await Unit.updateMany(
          { landlordId: { $ne: landlordId } },
          { landlordId: null }
        );

        // 🔥 Step 3 — Assign this landlord to his units
        for (const unitId of landlord.unitIds) {
          const unit = await Unit.findById(unitId);
          if (!unit) continue;

          // Close previous landlord record if exists
          if (unit.landlordId && unit.landlordId.toString() !== landlordId) {
            const lastPrev = unit.landlordHistory
              .slice()
              .reverse()
              .find((h) => h.isActive === true && !h.endDate);

            if (lastPrev) {
              lastPrev.isActive = false;
              lastPrev.endDate = new Date();
            }
          }

          unit.landlordId = landlord._id;

          unit.landlordHistory.push({
            landlordId,
            startDate: new Date(),
            isActive: true,
          });

          await unit.save();
        }
      } else if (updates.isActive === false) {
        // 🔥 Deactivate this landlord only
        for (const unitId of landlord.unitIds) {
          const unit = await Unit.findById(unitId);
          if (!unit) continue;

          const lastActive = unit.landlordHistory
            .slice()
            .reverse()
            .find((h) => h.isActive === true && !h.endDate);

          if (lastActive) {
            lastActive.isActive = false;
            lastActive.endDate = new Date();
          }

          unit.landlordId = null;
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
