import mongoose from "mongoose";
import Razorpay from "razorpay";
export const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const walletTransactionSchema = new mongoose.Schema(
  {
    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Landlord",
      required: true,
    },
    type: { type: String, enum: ["credit", "debit"], required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    referenceId: { type: String }, // e.g. Razorpay Payment ID or Bill ID
    method: {
      type: String,
      enum: ["razorpay", "wallet", "adjustment"],
      default: "wallet",
    },
  },
  { timestamps: true }
);

const WalletTransaction =
  mongoose.models.WalletTransaction ||
  mongoose.model("WalletTransaction", walletTransactionSchema);

export default WalletTransaction;
