import Razorpay from "razorpay";
import crypto from "crypto";
import MaintenanceBill from "../models/MaintenanceBill.modal.js"; // adjust as per your path

// 🔹 Create Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 🔹 Create order for a bill
export const createOrder = async (req, res) => {
  try {
    const { billId } = req.body;

    const bill = await MaintenanceBill.findById(billId);
    if (!bill) {
      return res
        .status(404)
        .json({ success: false, message: "Bill not found" });
    }

    const options = {
      amount: Math.round(bill.totalAmount * 100), // convert to paise
      currency: "INR",
      receipt: `receipt_${billId}`,
      notes: {
        landlordId: bill.landlordId,
        siteId: bill.siteId,
        unitId: bill.unitId,
      },
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      orderId: order.id,
      amount: options.amount,
      currency: options.currency,
      key: process.env.RAZORPAY_KEY_ID,
      billId,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Error creating Razorpay order" });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      billId,
    } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expectedSign === razorpay_signature) {
      // ✅ Update bill payment status
      await MaintenanceBill.findByIdAndUpdate(billId, {
        status: "Paid",
        paymentStatus: true,
        paymentId: razorpay_payment_id,
        paidAt: new Date(),
      });

      res.json({ success: true, message: "Payment verified successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Error verifying payment" });
  }
};
