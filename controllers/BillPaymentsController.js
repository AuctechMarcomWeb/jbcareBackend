import BillsPayments from "../models/BillPayments.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";
import PaymentLedger from "../models/paymentLedger.modal.js";
import Landlord from "../models/LandLord.modal.js";
import Tenant from "../models/Tenant.modal.js";
import Bills from "../models/Bills.modal.js";

import Razorpay from "razorpay";
import crypto from "crypto";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// lanloard wallet add 

export const addWalletPayment = async (req, res) => {
    try {
        const { landlordId, siteId, unitId, totalAmount } = req.body;

        if (!landlordId || !siteId || !unitId || !totalAmount) {
            return sendError(res, "Missing required fields");
        }
        // Step 1️⃣: Create pending bill payment
        const billPayment = await BillsPayments.create({
            landlordId,
            siteId,
            unitId,
            remark: "Wallet Top-Up Payment",
            totalAmount,
            payerId: landlordId,
            paidBy: "Landlord",
            status: "Pending",
        });

        const options = {
            amount: totalAmount * 100, // amount in paise
            currency: "INR",
            receipt: "receipt_" + billPayment._id,
        };

        const order = await razorpay.orders.create(options);

        billPayment.razorpayOrderId = order.id;
        await billPayment.save();

        return sendSuccess(res, { billPayment, order }, " payment created & Razorpay order generated");
    } catch (error) {
        console.error("Error in payByLandlordOnline:", error);
        return sendError(res, error.message);
    }
};

export const verifyRazorpayPaymentForWallet = async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !paymentId) {
            return sendError(res, "Missing required fields");
        }

        // Step 1️⃣: Verify signature
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
                lastUpdatedDate: new Date(),
            });
            return sendError(res, "Payment verification failed");
        }

        // Step 2️⃣: Update payment status → Success
        const payment = await BillsPayments.findByIdAndUpdate(
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

        if (!payment) return sendError(res, "Payment record not found");

        // 👉 Get landlord ID from payment record
        const landlordId = payment.landlordId;
        const amount = payment.totalAmount;

        // Step 3️⃣: Add money to landlord wallet
        const landlord = await Landlord.findById(landlordId);
        if (!landlord) return sendError(res, "Landlord not found");

        landlord.walletBalance = Number(landlord.walletBalance) + Number(amount);
        await landlord.save();



        return sendSuccess(
            res,
            {
                payment,
                newWalletBalance: landlord.walletBalance,
            },
            "Payment verified and wallet balance updated successfully"
        );

    } catch (error) {
        console.error("Error in verifyRazorpayPayment:", error);
        return sendError(res, error.message);
    }
};

// tenant wallet add 

export const addTenantWalletPayment = async (req, res) => {
    try {
        const { tenantId, siteId, unitId, totalAmount } = req.body;

        if (!tenantId || !siteId || !unitId || !totalAmount) {
            return sendError(res, "Missing required fields");
        }
        // Step 1️⃣: Create pending bill payment
        const billPayment = await BillsPayments.create({
            tenantId,
            siteId,
            unitId,
            remark: "Wallet Top-Up Payment",
            totalAmount,
            payerId: tenantId,
            paidBy: "Tenant",
            status: "Pending",
        });

        const options = {
            amount: totalAmount * 100, // amount in paise
            currency: "INR",
            receipt: "receipt_" + billPayment._id,
        };

        const order = await razorpay.orders.create(options);

        billPayment.razorpayOrderId = order.id;
        await billPayment.save();

        return sendSuccess(res, { billPayment, order }, " payment created & Razorpay order generated");
    } catch (error) {
        console.error("Error in payByTenantIdOnline:", error);
        return sendError(res, error.message);
    }
};

export const verifyRazorpayPaymentForTenantWallet = async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !paymentId) {
            return sendError(res, "Missing required fields");
        }

        // Step 1️⃣: Verify signature
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
                lastUpdatedDate: new Date(),
            });
            return sendError(res, "Payment verification failed");
        }

        // Step 2️⃣: Update payment status → Success
        const payment = await BillsPayments.findByIdAndUpdate(
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

        if (!payment) return sendError(res, "Payment record not found");

        // 👉 Get landlord ID from payment record
        const tenantId = payment.tenantId;
        const amount = payment.totalAmount;

        // Step 3️⃣: Add money to landlord wallet
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) return sendError(res, "Landlord not found");

        tenant.walletBalance = Number(tenant.walletBalance) + Number(amount);
        await tenant.save();



        return sendSuccess(
            res,
            {
                payment,
                newWalletBalance: tenant.walletBalance,
            },
            "Payment verified and wallet balance updated successfully"
        );

    } catch (error) {
        console.error("Error in verifyRazorpayPayment:", error);
        return sendError(res, error.message);
    }
};


// online lanlord payment

export const payByLandlordOnline = async (req, res) => {
    try {
        const { landlordId, billId, siteId, unitId, totalAmount, payerId } = req.body;

        if (!landlordId || !siteId || !unitId || !billId || !totalAmount) {
            return sendError(res, "Missing required fields");
        }

        // Step 0️⃣: Check if bill is already paid
        const bill = await Bills.findById(billId);
        if (!bill) {
            return sendError(res, "Bill not found");
        }
        if (bill.status === "Paid") {
            return sendError(res, "Bill is already paid");
        }

        // Step 1️⃣: Create pending bill payment
        const billPayment = await BillsPayments.create({
            landlordId,
            siteId,
            unitId,
            remark: "Online Bill Payment ",
            billId,
            totalAmount,
            payerId: payerId || landlordId,
            paidBy: "Landlord",
            status: "Pending",
        });

        // Step 2️⃣: Create Razorpay order
        const options = {
            amount: totalAmount * 100, // amount in paise
            currency: "INR",
            receipt: "receipt_" + billPayment._id,
        };

        const order = await razorpay.orders.create(options);

        // Step 3️⃣: Update payment with order ID
        billPayment.razorpayOrderId = order.id;
        await billPayment.save();

        return sendSuccess(res, { billPayment, order }, "Bill payment created & Razorpay order generated");
    } catch (error) {
        console.error("Error in payByLandlordOnline:", error);
        return sendError(res, error.message);
    }
};

export const verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !paymentId) {
            return sendError(res, "Missing required fields");
        }

        // Step 1️⃣: Verify signature
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
                lastUpdatedDate: new Date(),
            });
            return sendError(res, "Payment verification failed");
        }

        // Step 2️⃣: Update payment status
        const payment = await BillsPayments.findByIdAndUpdate(
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

        // Step 3️⃣: Update bill status
        const bill = await Bills.findById(payment.billId);
        if (bill) {
            bill.status = "Paid";
            bill.paidAt = new Date();
            bill.paidBy = "Online";
            bill.paymentMode = "Online";
            bill.paymentId = razorpayPaymentId;
            bill.payerId = payment.landlordId;
            await bill.save();
        }

        // Step 4️⃣: Update ledger (Credit)
        const lastLedgerEntry = await PaymentLedger.findOne({
            landlordId: payment.landlordId,
            siteId: payment.siteId,
            unitId: payment.unitId,
        }).sort({ entryDate: -1 });

        const openingBalance = lastLedgerEntry ? lastLedgerEntry.closingBalance : 0;

        await PaymentLedger.create({
            landlordId: payment.landlordId,
            siteId: payment.siteId,
            unitId: payment.unitId,
            remark: "Bill Paid Online",
            description: `Payment for Bill ${bill?._id}`,
            paymentMode: "Online",
            entryType: "Credit",
            debitAmount: 0,
            creditAmount: payment.totalAmount,
            openingBalance,
            closingBalance: openingBalance + payment.totalAmount,
            entryDate: new Date(),
        });

        return sendSuccess(res, { payment, bill }, "Payment verified successfully and ledger updated");

    } catch (error) {
        console.error("Error in verifyRazorpayPayment:", error);
        return sendError(res, error.message);
    }
};

// online tenant payment

export const payByTenantOnline = async (req, res) => {
    try {
        const { tenantId, billId, siteId, unitId, totalAmount, payerId } = req.body;

        if (!tenantId || !siteId || !unitId || !billId || !totalAmount) {
            return sendError(res, "Missing required fields");
        }

        // Step 0️⃣: Check if bill is already paid
        const bill = await Bills.findById(billId);
        if (!bill) {
            return sendError(res, "Bill not found");
        }
        if (bill.status === "Paid") {
            return sendError(res, "Bill is already paid");
        }

        // Step 1️⃣: Create pending bill payment
        const billPayment = await BillsPayments.create({
            tenantId,
            siteId,
            unitId,
            remark: "Online Bill Payment ",
            billId,
            totalAmount,
            payerId: tenantId,
            paidBy: "Tenant",
            status: "Pending",
        });

        // Step 2️⃣: Create Razorpay order
        const options = {
            amount: totalAmount * 100, // amount in paise
            currency: "INR",
            receipt: "receipt_" + billPayment._id,
        };

        const order = await razorpay.orders.create(options);

        // Step 3️⃣: Update payment with order ID
        billPayment.razorpayOrderId = order.id;
        await billPayment.save();

        return sendSuccess(res, { billPayment, order }, "Bill payment created & Razorpay order generated");
    } catch (error) {
        console.error("Error in payByTenantOnline:", error);
        return sendError(res, error.message);
    }
};

export const verifyRazorpayTenantPayment = async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !paymentId) {
            return sendError(res, "Missing required fields");
        }

        // Step 1️⃣: Verify signature
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
                lastUpdatedDate: new Date(),
            });
            return sendError(res, "Payment verification failed");
        }

        // Step 2️⃣: Update payment status
        const payment = await BillsPayments.findByIdAndUpdate(
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

        console.log("payment", payment);


        // Step 3️⃣: Update bill status
        const bill = await Bills.findById(payment.billId);
        if (bill) {
            bill.status = "Paid";
            bill.paidAt = new Date();
            bill.paidBy = "Online";
            bill.paymentMode = "Online";
            bill.paymentId = razorpayPaymentId;
            bill.payerId = payment.tenantId;
            await bill.save();
        }

        // Step 4️⃣: Update ledger (Credit)
        const lastLedgerEntry = await PaymentLedger.findOne({
            tenantId: payment.tenantId,
            siteId: payment.siteId,
            unitId: payment.unitId,
        }).sort({ entryDate: -1 });

        const openingBalance = lastLedgerEntry ? lastLedgerEntry.closingBalance : 0;

        await PaymentLedger.create({
            tenantId: payment.tenantId,
            siteId: payment.siteId,
            unitId: payment.unitId,
            remark: "Bill Paid Online",
            description: `Payment for Bill ${bill?._id}`,
            paymentMode: "Online",
            entryType: "Credit",
            debitAmount: 0,
            creditAmount: payment.totalAmount,
            openingBalance,
            closingBalance: openingBalance + payment.totalAmount,
            entryDate: new Date(),
        });

        return sendSuccess(res, { payment, bill }, "Payment verified successfully and ledger updated");

    } catch (error) {
        console.error("Error in verifyRazorpayPayment:", error);
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

//  payBillFromLanlordWallet 

export const payBillFromLanlordWallet = async (req, res) => {
    try {
        const { billId, landlordId, siteId, unitId, amount } = req.body;

        if (!billId || !landlordId || !siteId || !unitId || !amount) {
            return res.status(400).json({
                success: false,
                message: "billId, landlordId, siteId, unitId, and amount are required.",
            });
        }

        // 1️⃣ Find landlord
        const landlord = await Landlord.findById(landlordId);
        if (!landlord) {
            return res.status(404).json({
                success: false,
                message: "Landlord not found.",
            });
        }

        // 2️⃣ Find bill
        const bill = await Bills.findById(billId);
        if (!bill) {
            return res.status(404).json({
                success: false,
                message: "Bill not found.",
            });
        }

        // 🚫 NEW VALIDATION: Check if bill is already paid
        if (bill.status === "Paid") {
            return res.status(400).json({
                success: false,
                message: "Bill is already paid.",
            });
        }

        // 3️⃣ Ensure bill belongs to landlord
        if (bill.landlordId.toString() !== landlordId.toString()) {
            return res.status(400).json({
                success: false,
                message: "This bill does not belong to the provided landlord.",
            });
        }

        // 4️⃣ Validate site
        if (bill.siteId.toString() !== siteId.toString()) {
            return res.status(400).json({
                success: false,
                message: "Provided siteId does not match the bill's siteId.",
            });
        }

        // 5️⃣ Validate unit
        if (bill.unitId.toString() !== unitId.toString()) {
            return res.status(400).json({
                success: false,
                message: "Provided unitId does not match the bill's unitId.",
            });
        }

        // 6️⃣ Check wallet balance
        if (landlord.walletBalance < amount) {
            return res.status(400).json({
                success: false,
                message: "Insufficient wallet balance.",
                walletBalance: landlord.walletBalance,
            });
        }

        // 7️⃣ Payment amount validation
        if (amount > bill.totalAmount) {
            return res.status(400).json({
                success: false,
                message: "Amount cannot be greater than the bill total amount.",
            });
        }

        // 8️⃣ Deduct wallet balance
        landlord.walletBalance -= amount;
        await landlord.save();

        // 9️⃣ Update Bill Status
        bill.status = "Paid";
        bill.paidAt = new Date();
        bill.paidBy = "Wallet";
        bill.paymentMode = "Wallet";
        bill.paymentId = "WALLET-" + Date.now();
        bill.payerId = landlordId;
        await bill.save();

        // 🔟 Create Payment Record
        const payment = await BillsPayments.create({
            landlordId,
            billId,
            siteId,
            unitId,
            totalAmount: amount,
            status: "Success",
            paymentMode: "Wallet",
            remark: `Bill #${billId} paid using wallet`,
            description: "Wallet Payment",
            paidAt: new Date(),
            paidBy: "Wallet",
            payerId: landlordId,
        });

        // 🧾 1️⃣1️⃣  LEDGER ENTRY
        const lastEntry = await PaymentLedger.findOne({
            landlordId,
            siteId,
            unitId,
        }).sort({ entryDate: -1 });

        const openingBalance = lastEntry ? lastEntry.closingBalance : 0;

        // Wallet payment = landlord pays amount = DEBIT entry
        const entryType = "Credit";
        const debitAmount = 0;
        const creditAmount = amount;

        const closingBalance = openingBalance + creditAmount;

        await PaymentLedger.create({
            landlordId,
            siteId,
            unitId,
            remark: `Bill #${billId} Wallet Payment`,
            description: `Wallet payment for Bill No ${bill.billNo || billId}`,
            paymentMode: "Wallet",
            entryType,      // Debit
            debitAmount,    // amount
            creditAmount,
            openingBalance,
            closingBalance,
            entryDate: new Date(),
        });

        return res.status(200).json({
            success: true,
            message: "Bill paid successfully using wallet.",
            walletBalance: landlord.walletBalance,
            bill,
            payment,
        });

    } catch (error) {
        console.error("Wallet Payment Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error.",
            error: error.message,
        });
    }
};

//  payBillFromTenantWallet 

export const payBillFromTenantWallet = async (req, res) => {
    try {
        const { billId, tenantId, siteId, unitId, amount } = req.body;

        if (!billId || !tenantId || !siteId || !unitId || !amount) {
            return res.status(400).json({
                success: false,
                message: "billId, tenantId, siteId, unitId, and amount are required.",
            });
        }

        // 1️⃣ Find tenant
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: "tenant not found.",
            });
        }

        // 2️⃣ Find bill
        const bill = await Bills.findById(billId);
        if (!bill) {
            return res.status(404).json({
                success: false,
                message: "Bill not found.",
            });
        }

        // 🚫 NEW VALIDATION: Check if bill is already paid
        if (bill.status === "Paid") {
            return res.status(400).json({
                success: false,
                message: "Bill is already paid.",
            });
        }

        // 3️⃣ Ensure bill belongs to landlord
        if (bill.tenantId.toString() !== tenantId.toString()) {
            return res.status(400).json({
                success: false,
                message: "This bill does not belong to the provided landlord.",
            });
        }

        // 4️⃣ Validate site
        if (bill.siteId.toString() !== siteId.toString()) {
            return res.status(400).json({
                success: false,
                message: "Provided siteId does not match the bill's siteId.",
            });
        }

        // 5️⃣ Validate unit
        if (bill.unitId.toString() !== unitId.toString()) {
            return res.status(400).json({
                success: false,
                message: "Provided unitId does not match the bill's unitId.",
            });
        }

        // 6️⃣ Check wallet balance
        if (tenant.walletBalance < amount) {
            return res.status(400).json({
                success: false,
                message: "Insufficient wallet balance.",
                walletBalance: tenant.walletBalance,
            });
        }

        // 7️⃣ Payment amount validation
        if (amount > bill.totalAmount) {
            return res.status(400).json({
                success: false,
                message: "Amount cannot be greater than the bill total amount.",
            });
        }

        // 8️⃣ Deduct wallet balance
        tenant.walletBalance -= amount;
        await tenant.save();

        // 9️⃣ Update Bill Status
        bill.status = "Paid";
        bill.paidAt = new Date();
        bill.paidBy = "Wallet";
        bill.paymentMode = "Wallet";
        bill.paymentId = "WALLET-" + Date.now();
        bill.payerId = tenantId;
        await bill.save();

        // 🔟 Create Payment Record
        const payment = await BillsPayments.create({
            tenantId,
            billId,
            siteId,
            unitId,
            totalAmount: amount,
            status: "Success",
            paymentMode: "Wallet",
            remark: `Bill #${billId} paid using wallet`,
            description: "Wallet Payment",
            paidAt: new Date(),
            paidBy: "Wallet",
            payerId: tenantId,
        });

        // 🧾 1️⃣1️⃣  LEDGER ENTRY
        const lastEntry = await PaymentLedger.findOne({
            tenantId,
            siteId,
            unitId,
        }).sort({ entryDate: -1 });

        const openingBalance = lastEntry ? lastEntry.closingBalance : 0;

        // Wallet payment = landlord pays amount = DEBIT entry
        const entryType = "Credit";
        const debitAmount = 0;
        const creditAmount = amount;

        const closingBalance = openingBalance + creditAmount;

        await PaymentLedger.create({
            tenantId,
            siteId,
            unitId,
            remark: `Bill #${billId} Wallet Payment`,
            description: `Wallet payment for Bill No ${bill.billNo || billId}`,
            paymentMode: "Wallet",
            entryType,      // Debit
            debitAmount,    // amount
            creditAmount,
            openingBalance,
            closingBalance,
            entryDate: new Date(),
        });

        return res.status(200).json({
            success: true,
            message: "Bill paid successfully using wallet.",
            walletBalance: tenant.walletBalance,
            bill,
            payment,
        });

    } catch (error) {
        console.error("Wallet Payment Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error.",
            error: error.message,
        });
    }
};


export const payBillbyAdmin = async (req, res) => {
    try {
        const { billId, landlordId, siteId, unitId, amount, paymentMode, chequeNumber, paymentId } = req.body;

        if (!billId || !landlordId || !siteId || !unitId || !amount) {
            return res.status(400).json({
                success: false,
                message: "billId, landlordId, siteId, unitId, and amount are required.",
            });
        }

        // 1️⃣ Find landlord
        const landlord = await Landlord.findById(landlordId);
        if (!landlord) {
            return res.status(404).json({
                success: false,
                message: "Landlord not found.",
            });
        }

        // 2️⃣ Find bill
        const bill = await Bills.findById(billId);
        if (!bill) {
            return res.status(404).json({
                success: false,
                message: "Bill not found.",
            });
        }

        // 🚫 NEW VALIDATION: Check if bill is already paid
        if (bill.status === "Paid") {
            return res.status(400).json({
                success: false,
                message: "Bill is already paid.",
            });
        }

        // 3️⃣ Ensure bill belongs to landlord
        if (bill.landlordId.toString() !== landlordId.toString()) {
            return res.status(400).json({
                success: false,
                message: "This bill does not belong to the provided landlord.",
            });
        }

        // 4️⃣ Validate site
        if (bill.siteId.toString() !== siteId.toString()) {
            return res.status(400).json({
                success: false,
                message: "Provided siteId does not match the bill's siteId.",
            });
        }

        // 5️⃣ Validate unit
        if (bill.unitId.toString() !== unitId.toString()) {
            return res.status(400).json({
                success: false,
                message: "Provided unitId does not match the bill's unitId.",
            });
        }



        // 7️⃣ Payment amount validation
        // if (amount > bill.totalAmount) {
        //     return res.status(400).json({
        //         success: false,
        //         message: "Amount cannot be greater than the bill total amount.",
        //     });
        // }

        await landlord.save();

        // 9️⃣ Update Bill Status
        bill.status = "Paid";
        bill.paidAt = new Date();
        bill.paidBy = "Admin";
        bill.paymentMode = paymentMode;
        bill.chequeNumber = chequeNumber;
        if (paymentId) {

            bill.paymentId = paymentId;
        } else {
            bill.paymentId = "Admin-" + Date.now();

        }
        bill.payerId = landlordId;
        await bill.save();

        // 🔟 Create Payment Record
        const payment = await BillsPayments.create({
            landlordId,
            billId,
            siteId,
            unitId,
            totalAmount: amount,
            status: "Success",
            paymentMode: paymentMode,
            chequeNumber: chequeNumber,
            remark: `Bill #${billId} paid by Admin`,
            description: " Paid By Admin ",
            paidAt: new Date(),
            paidBy: "Admin",
            payerId: landlordId,
        });

        // 🧾 1️⃣1️⃣  LEDGER ENTRY
        const lastEntry = await PaymentLedger.findOne({
            landlordId,
            siteId,
            unitId,
        }).sort({ entryDate: -1 });

        const openingBalance = lastEntry ? lastEntry.closingBalance : 0;

        // Wallet payment = landlord pays amount = DEBIT entry
        const entryType = "Credit";
        const debitAmount = 0;
        const creditAmount = amount;

        const closingBalance = openingBalance + creditAmount;

        await PaymentLedger.create({
            landlordId,
            siteId,
            unitId,
            remark: `Bill #${billId} Admin Payment`,
            description: `Admin payment for Bill No ${bill.billNo || billId}`,
            paymentMode: paymentMode,
            entryType,      // Debit
            chequeNumber,      // Debit
            debitAmount,    // amount
            creditAmount,
            openingBalance,
            closingBalance,
            entryDate: new Date(),
        });

        return res.status(200).json({
            success: true,
            message: "Bill paid successfully by Admin.",
            walletBalance: landlord.walletBalance,
            bill,
            payment,
        });

    } catch (error) {
        console.error("Admin Payment Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error.",
            error: error.message,
        });
    }
};


export const getAllBillsPayments = async (req, res) => {
    try {
        const { landlordId, tenantId, siteId, unitId, status, page = 1, limit = 10 } = req.query;

        const filters = {};

        if (tenantId) filters.tenantId = tenantId;
        if (landlordId) filters.landlordId = landlordId;
        if (siteId) filters.siteId = siteId;
        if (unitId) filters.unitId = unitId;
        if (status) filters.status = status;

        const skip = (page - 1) * limit;

        const payments = await BillsPayments.find(filters)
            .populate("landlordId siteId unitId payerId tenantId")
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
            "landlordId siteId unitId payerId tenantId"
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
