import mongoose from "mongoose";

const LedgerSchema = new mongoose.Schema(
  {
    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Landlord",
      required: true,
    },

    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },
    type: {
      type: String,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },

    // Bill ID (optional)
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Billing",
      default: null,
    },

    purpose: { type: String, trim: true }, // e.g., "Electricity Bill", "Bill Payment", etc.

    amount: { type: Number, default: 0 },
    // Balance tracking
    // 🆕 Opening Balance with debit/credit type
    openingBalance: {
      amount: { type: Number, default: 0 }, // Opening balance
      type: {
        type: String,
        enum: ["Debit", "Credit", null], // Debit = pending, Credit = advance
        default: null,
      },
    },
    closingBalance: {
      amount: { type: Number, default: 0 },
      type: { type: String, enum: ["Debit", "Credit", null], default: null },
    },
    transactionType: {
      type: String,
      enum: ["Bill", "Payment", "Opening Balance"],
    },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Ledger", LedgerSchema);
