import FixElectricityCharges from "../models/masters/FixElectricityCharges.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

// ======================================================
// ✅ Create Fix Electricity Charges
// ======================================================
export const createFixElectricityCharges = async (req, res) => {
    try {
        const { siteTypeId, fixLoadcharges, fixmantance } = req.body;

        if (!siteTypeId) {
            return sendError(res, "siteTypeId is required", 400);
        }

        if (fixLoadcharges == null || typeof fixLoadcharges !== "number") {
            return sendError(res, "fixLoadcharges must be a valid number", 400);
        }

        if (fixmantance == null || typeof fixmantance !== "number") {
            return sendError(res, "fixmantance must be a valid number", 400);
        }

        // Check if already exists for same siteType
        const existing = await FixElectricityCharges.findOne({ siteTypeId });

        if (existing) {
            return sendError(
                res,
                "Charges for this SiteType already exist. Please update instead.",
                400
            );
        }

        const created = await FixElectricityCharges.create({
            siteTypeId,
            fixLoadcharges,
            fixmantance,
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
            search,
            isActive,
            isPagination = "true",
            page = 1,
            limit = 10,
        } = req.query;

        const match = {};

        if (search && search.trim() !== "") {
            const regex = new RegExp(search.trim(), "i");
            match.$or = [
                { fixLoadcharges: { $regex: regex } },
                { fixmantance: { $regex: regex } },
            ];
        }

        if (isActive !== undefined) {
            match.isActive = isActive === "true";
        }

        let query = FixElectricityCharges.find(match)
            .populate("siteTypeId")
            .sort({ createdAt: -1 });

        const total = await FixElectricityCharges.countDocuments(match);

        if (isPagination === "true") {
            query = query
                .skip((page - 1) * parseInt(limit))
                .limit(parseInt(limit));
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
        const { siteTypeId, fixLoadcharges, fixmantance, isActive } = req.body;

        // Check duplicate siteTypeId if changed
        if (siteTypeId) {
            const existing = await FixElectricityCharges.findOne({
                _id: { $ne: req.params.id },
                siteTypeId,
            });

            if (existing) {
                return sendError(
                    res,
                    "Charges for this SiteType already exist",
                    400
                );
            }
        }

        const updated = await FixElectricityCharges.findByIdAndUpdate(
            req.params.id,
            { siteTypeId, fixLoadcharges, fixmantance, isActive },
            { new: true }
        );

        if (!updated) return sendError(res, "Record not found", 404);

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
        const deleted = await FixElectricityCharges.findByIdAndDelete(
            req.params.id
        );
        if (!deleted) return sendError(res, "Record not found", 404);

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
