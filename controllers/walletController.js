import crypto from "crypto";
import { razorpayInstance } from "../models/utilsSchemas/WalletTransactions.modal.js";
import Landlord from "../models/LandLord.modal.js";
import WalletTransaction from "../models/utilsSchemas/WalletTransactions.modal.js";

// 🧾 Create Razorpay order
export const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount)
      return res
        .status(400)
        .json({ success: false, message: "Amount is required" });

    const options = {
      amount: amount * 100, // Convert to paise
      currency: "INR",
      receipt: `wallet_${Date.now()}`,
    };

    const order = await razorpayInstance.orders.create(options);

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Razorpay Order Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create Razorpay order" });
  }
};

// ✅ Verify payment and credit wallet
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      landlordId,
    } = req.body;

    if (!landlordId)
      return res
        .status(400)
        .json({ success: false, message: "Landlord ID is required" });

    // Verify Razorpay signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment signature" });
    }

    // Update landlord wallet
    const landlord = await Landlord.findById(landlordId);
    if (!landlord)
      return res
        .status(404)
        .json({ success: false, message: "Landlord not found" });

    landlord.walletBalance = (landlord.walletBalance || 0) + Number(amount);
    await landlord.save();

    // Record credit transaction
    await WalletTransaction.create({
      landlordId,
      type: "credit",
      amount,
      description: "Wallet Top-Up via Razorpay",
      referenceId: razorpay_payment_id,
      method: "razorpay",
    });

    res.status(200).json({
      success: true,
      message: "Wallet recharged successfully",
      updatedBalance: landlord.walletBalance,
    });
  } catch (error) {
    console.error("Wallet verification error:", error);
    res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: error.message,
    });
  }
};

// 💳 Pay bill using wallet (Debit)
export const payUsingWallet = async (req, res) => {
  try {
    const { landlordId, amount, billId } = req.body;

    if (!landlordId || !amount)
      return res
        .status(400)
        .json({ success: false, message: "Landlord ID and amount required" });

    const landlord = await Landlord.findById(landlordId);
    if (!landlord)
      return res
        .status(404)
        .json({ success: false, message: "Landlord not found" });

    if (landlord.walletBalance < amount)
      return res
        .status(400)
        .json({ success: false, message: "Insufficient wallet balance" });

    landlord.walletBalance -= Number(amount);
    await landlord.save();

    await WalletTransaction.create({
      landlordId,
      type: "debit",
      amount,
      description: `Maintenance Bill Payment${billId ? ` (${billId})` : ""}`,
      referenceId: billId || "",
      method: "wallet",
    });

    res.status(200).json({
      success: true,
      message: "Payment deducted from wallet successfully",
      updatedBalance: landlord.walletBalance,
    });
  } catch (error) {
    console.error("Wallet debit error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to process payment" });
  }
};

// 📜 Get wallet history
export const getWalletHistory = async (req, res) => {
  try {
    const { landlordId } = req.params;

    const landlord = await Landlord.findById(landlordId).select(
      "walletBalance"
    );
    if (!landlord)
      return res
        .status(404)
        .json({ success: false, message: "Landlord not found" });

    const transactions = await WalletTransaction.find({ landlordId })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      walletBalance: landlord.walletBalance,
      transactions,
    });
  } catch (error) {
    console.error("Get wallet history error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch wallet history" });
  }
};
