import PaymentLedger from "../models/paymentLedger.modal.js";
import mongoose from "mongoose";
import { sendError, sendSuccess } from "../utils/responseHandler.js";


export const createLedgerEntry = async (req, res) => {
    try {
        const {
            landlordId,
            siteId,
            unitId,
            remark,
            description,
            paymentMode,
            entryType,
            debitAmount,
            creditAmount,
        } = req.body;

        // Required field validation
        if (!landlordId || !siteId || !unitId) {
            return sendError(res, "landlordId, siteId, and unitId required", 400);
        }

        // Get last closing balance
        const lastEntry = await PaymentLedger.findOne({
            landlordId,
            siteId,
            unitId,
        }).sort({ createdAt: -1 });

        const openingBalance = lastEntry ? lastEntry.closingBalance : 0;
        let closingBalance = openingBalance;

        // ledger logic
        if (entryType === "Credit") {
            closingBalance = openingBalance + (creditAmount || 0);
        } else if (entryType === "Debit") {
            closingBalance = openingBalance - (debitAmount || 0);
        }

        const ledger = await PaymentLedger.create({
            landlordId,
            siteId,
            unitId,
            remark,
            description,
            paymentMode,
            entryType,
            debitAmount,
            creditAmount,
            openingBalance,
            closingBalance,
        });

        return sendSuccess(res, "Ledger entry created successfully", ledger, 201);

    } catch (error) {
        console.error("Create Ledger Error:", error);
        return sendError(res, error.message);
    }
};

export const getAllLedgerEntries = async (req, res) => {
    try {
        const {
            landlordId,
            tenantId,
            siteId,
            unitId,
            entryType,
            paymentMode,
            fromDate,
            toDate,
            page = 1,
            limit = 10,
        } = req.query;

        const filters = {};

        if (tenantId) filters.tenantId = tenantId;
        if (landlordId) filters.landlordId = landlordId;
        if (siteId) filters.siteId = siteId;
        if (unitId) filters.unitId = unitId;
        if (entryType) filters.entryType = entryType;
        if (paymentMode) filters.paymentMode = paymentMode;

        // Date filters
        if (fromDate || toDate) {
            filters.entryDate = {};
            if (fromDate)
                filters.entryDate.$gte = new Date(new Date(fromDate).setHours(0, 0, 0, 0));

            if (toDate)
                filters.entryDate.$lte = new Date(new Date(toDate).setHours(23, 59, 59, 999));
        }

        const skip = (page - 1) * limit;

        const entries = await PaymentLedger.find(filters)
            .populate("landlordId", "name")
            .populate("siteId", "siteName")
            .populate("unitId", "unitNumber")
            .sort({ entryDate: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await PaymentLedger.countDocuments(filters);

        return sendSuccess(res, "Ledger entries fetched successfully", {
            data: entries,
            total,
            currentPage: Number(page),
            totalPages: Math.ceil(total / limit),
        });

    } catch (error) {
        console.error("Get Ledger Error:", error);
        return sendError(res, error.message);
    }
};

export const getLedgerEntryById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id))
            return sendError(res, "Invalid ID");

        const entry = await PaymentLedger.findById(id)
            .populate("landlordId", "name")
            .populate("siteId", "siteName")
            .populate("unitId", "unitNumber");

        if (!entry) return sendError(res, "Ledger entry not found", 404);

        return sendSuccess(res, "Ledger entry fetched successfully", entry);

    } catch (error) {
        console.error("Get Single Ledger Error:", error);
        return sendError(res, error.message);
    }
};

export const updateLedgerEntry = async (req, res) => {
    try {
        const { id } = req.params;

        const ledger = await PaymentLedger.findById(id);
        if (!ledger) return sendError(res, "Ledger entry not found", 404);

        Object.keys(req.body).forEach((key) => {
            ledger[key] = req.body[key];
        });

        await ledger.save();

        return sendSuccess(res, "Ledger entry updated successfully", ledger);

    } catch (error) {
        console.error("Update Ledger Error:", error);
        return sendError(res, error.message);
    }
};

export const deleteLedgerEntry = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await PaymentLedger.findByIdAndDelete(id);
        if (!deleted) return sendError(res, "Ledger entry not found", 404);

        return sendSuccess(res, "Ledger entry deleted successfully", deleted);

    } catch (error) {
        console.error("Delete Ledger Error:", error);
        return sendError(res, error.message);
    }
};
