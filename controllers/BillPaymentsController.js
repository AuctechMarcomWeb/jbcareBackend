import BillsPayments from "../models/BillPayments.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";
import PaymentLedger from "../models/paymentLedger.modal.js";

import Razorpay from "razorpay";
import crypto from "crypto";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createBillAndOrder = async (req, res) => {
    try {
        const { landlordId, siteId, unitId, totalAmount, payerId, paidBy } = req.body;

        if (!landlordId || !siteId || !unitId || !totalAmount) {
            return sendError(res, "Missing required fields");
        }

        // Step A: Create a pending bill entry
        const bill = await BillsPayments.create({
            landlordId,
            siteId,
            unitId,
            totalAmount,
            payerId: payerId || null,
            paidBy: paidBy || null,
            status: "Pending",
        });

        // Step B: Create Razorpay order
        const options = {
            amount: totalAmount * 100, // in paise
            currency: "INR",
            receipt: "receipt_" + bill._id,
        };

        const order = await razorpay.orders.create(options);

        // Step C: Update bill with razorpay order ID
        bill.razorpayOrderId = order.id;
        await bill.save();

        return sendSuccess(res, { bill, order }, "Bill created & Razorpay order generated");
    } catch (error) {
        return sendError(res, error.message);
    }
};

export const verifyRazorpayPayment = async (req, res) => {
    try {
        const {
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            paymentId, // BillsPayments _id
        } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !paymentId) {
            return sendError(res, "Missing required fields");
        }

        // Step A: Verify signature
        const body = razorpayOrderId + "|" + razorpayPaymentId;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpaySignature) {
            await BillsPayments.findByIdAndUpdate(paymentId, {
                status: "Failed",
                razorpayOrderId,
                razorpayPaymentId,
                razorpaySignature,
            });

            return sendError(res, "Payment verification failed");
        }

        // Step B: Mark as Success
        const updatedPayment = await BillsPayments.findByIdAndUpdate(
            paymentId,
            {
                status: "Success",
                razorpayOrderId,
                razorpayPaymentId,
                razorpaySignature,
                paidAt: new Date(),
                lastUpdatedDate: new Date(),
            },
            { new: true }
        );

        return sendSuccess(res, updatedPayment, "Payment verified successfully");
    } catch (error) {
        return sendError(res, error.message);
    }
};




export const createBillsPayment = async (req, res) => {
    try {
        const {
            landlordId,
            siteId,
            unitId,
            totalAmount,
            status = "Success",
            paymentMode,
            remark, description
        } = req.body;

        if (!landlordId || !siteId || !unitId || !totalAmount) {
            return sendError(res, "Missing required fields");
        }

        const payment = await BillsPayments.create({
            landlordId,
            siteId,
            unitId,
            totalAmount,
            status,
            paymentMode,
            remark,
            description
        });


        // ✔ Get last ledger entry
        const lastEntry = await PaymentLedger.findOne({
            landlordId,
            siteId,
            unitId,
        }).sort({ entryDate: -1 });


        const openingBalance = lastEntry ? lastEntry?.closingBalance : 0;


        const entryType = "Credit";
        const debitAmount = 0;
        const creditAmount = totalAmount;


        const closingBalance = openingBalance + creditAmount;

        await PaymentLedger.create({
            landlordId,
            siteId,
            unitId,
            remark: remark,
            description: description,
            paymentMode: paymentMode,
            entryType,
            debitAmount,
            creditAmount,
            openingBalance,
            closingBalance,
            entryDate: new Date(),
        });


        return sendSuccess(res, payment, "Payment created successfully");
    } catch (error) {
        return sendError(res, `Error: ${error.message}`);
    }
};

export const getAllBillsPayments = async (req, res) => {
    try {
        const { landlordId, siteId, unitId, status, page = 1, limit = 10 } = req.query;

        const filters = {};

        if (landlordId) filters.landlordId = landlordId;
        if (siteId) filters.siteId = siteId;
        if (unitId) filters.unitId = unitId;
        if (status) filters.status = status;

        const skip = (page - 1) * limit;

        const payments = await BillsPayments.find(filters)
            .populate("landlordId siteId unitId payerId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await BillsPayments.countDocuments(filters);

        return sendSuccess(res, { total, payments }, "Payments fetched successfully");
    } catch (error) {
        return sendError(res, `Error: ${error.message}`);
    }
};

export const getBillsPaymentById = async (req, res) => {
    try {
        const { paymentId } = req.params;

        const payment = await BillsPayments.findById(paymentId).populate(
            "landlordId siteId unitId payerId"
        );

        if (!payment) return sendError(res, "Payment not found");

        return sendSuccess(res, payment, "Payment fetched successfully");
    } catch (error) {
        return sendError(res, `Error: ${error.message}`);
    }
};

export const updateBillsPayment = async (req, res) => {
    try {
        const { paymentId } = req.params;

        const updated = await BillsPayments.findByIdAndUpdate(
            paymentId,
            req.body,
            { new: true }
        );

        if (!updated) return sendError(res, "Payment not found");

        return sendSuccess(res, updated, "Payment updated successfully");
    } catch (error) {
        return sendError(res, `Error: ${error.message}`);
    }
};

export const deleteBillsPayment = async (req, res) => {
    try {
        const { paymentId } = req.params;

        const deleted = await BillsPayments.findByIdAndDelete(paymentId);

        if (!deleted) return sendError(res, "Payment not found");

        return sendSuccess(res, deleted, "Payment deleted successfully");
    } catch (error) {
        return sendError(res, `Error: ${error.message}`);
    }
};
