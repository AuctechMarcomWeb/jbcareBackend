import FixElectricityCharges from "../models/masters/FixElectricityCharges.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

// ======================================================
// ✅ Create Fix Electricity Charges
// ======================================================
export const createFixElectricityCharges = async (req, res) => {
    try {
        const {
            siteType,
            fixLoadcharges,
            fixmantance,
            surchargePercent,
            tariffRate,
            dgTariff,
        } = req.body;

        if (!siteType) {
            return sendError(res, "siteType is required", 400);
        }

        const numberFields = {
            fixLoadcharges,
            fixmantance,
            surchargePercent,
            tariffRate,
            dgTariff,
        };

        for (const [key, value] of Object.entries(numberFields)) {
            if (value == null || typeof value !== "number") {
                return sendError(res, `${key} must be a valid number`, 400);
            }
        }

        // 🔁 Prevent duplicate Site Type
        const existing = await FixElectricityCharges.findOne({ siteType });
        if (existing) {
            return sendError(
                res,
                "Charges for this Site Type already exist. Please update instead.",
                400
            );
        }

        const created = await FixElectricityCharges.create({
            siteType,
            fixLoadcharges,
            fixmantance,
            surchargePercent,
            tariffRate,
            dgTariff,
        });

        return sendSuccess(
            res,
            "Fix Electricity Charges created successfully",
            created,
            201
        );
    } catch (err) {
        return sendError(
            res,
            "Failed to create Fix Electricity Charges",
            500,
            err.message
        );
    }
};



// ======================================================
// ✅ Get All Fix Electricity Charges (With Pagination + Search)
// ======================================================
export const getAllFixElectricityCharges = async (req, res) => {
    try {
        const {
            siteType,
            isActive,
            isPagination = "true",
            page = 1,
            limit = 10,
        } = req.query;

        const match = {};

        // 🔍 Filter by siteType (case-insensitive)
        if (siteType) {
            match.siteType = new RegExp(`^${siteType}$`, "i");
        }

        // 🔘 Active filter
        if (isActive !== undefined) {
            match.isActive = isActive === "true";
        }

        let query = FixElectricityCharges.find(match)
            .sort({ createdAt: -1 });

        const total = await FixElectricityCharges.countDocuments(match);

        if (isPagination === "true") {
            query
                .skip((Number(page) - 1) * Number(limit))
                .limit(Number(limit));
        }

        const charges = await query;

        return sendSuccess(
            res,
            "Fix Electricity Charges fetched successfully",
            {
                charges,
                totalCharges: total,
                totalPages: Math.ceil(total / limit),
                currentPage: Number(page),
            },
            200
        );
    } catch (err) {
        return sendError(
            res,
            "Failed to fetch Fix Electricity Charges",
            500,
            err.message
        );
    }
};



// ======================================================
// ✅ Update Fix Electricity Charges
// ======================================================
export const updateFixElectricityCharges = async (req, res) => {
    try {
        const {
            siteType,
            fixLoadcharges,
            fixmantance,
            surchargePercent,
            tariffRate,
            dgTariff,
            isActive,
        } = req.body;

        // 🔁 Duplicate check if siteType changes
        if (siteType) {
            const duplicate = await FixElectricityCharges.findOne({
                _id: { $ne: req.params.id },
                siteType,
            });

            if (duplicate) {
                return sendError(
                    res,
                    "Charges for this Site Type already exist",
                    400
                );
            }
        }

        const updated = await FixElectricityCharges.findByIdAndUpdate(
            req.params.id,
            {
                siteType,
                fixLoadcharges,
                fixmantance,
                surchargePercent,
                tariffRate,
                dgTariff,
                isActive,
            },
            { new: true }
        );

        if (!updated) {
            return sendError(res, "Record not found", 404);
        }

        return sendSuccess(
            res,
            "Fix Electricity Charges updated successfully",
            updated,
            200
        );
    } catch (err) {
        return sendError(
            res,
            "Failed to update Fix Electricity Charges",
            500,
            err.message
        );
    }
};



// ======================================================
// ✅ Delete Fix Electricity Charges
// ======================================================
export const deleteFixElectricityCharges = async (req, res) => {
    try {
        const deleted = await FixElectricityCharges.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return sendError(res, "Record not found", 404);
        }

        return sendSuccess(
            res,
            "Fix Electricity Charges deleted successfully",
            null,
            200
        );
    } catch (err) {
        return sendError(
            res,
            "Failed to delete Fix Electricity Charges",
            500,
            err.message
        );
    }
};



