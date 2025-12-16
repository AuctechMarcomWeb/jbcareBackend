import mongoose from "mongoose";

const PaymentLedgerSchema = new mongoose.Schema({

    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: "Landlord", required: true },
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: "Unit", required: true },

    remark: { type: String },
    description: { type: String },
    chequeNumber: { type: String },

    paymentMode: {
        type: String,
    },

    entryType: {
        type: String,
        enum: ["Debit", "Credit"],
        required: true,
    },

    debitAmount: { type: Number, default: 0 },
    creditAmount: { type: Number, default: 0 },

    openingBalance: { type: Number, default: 0 },
    closingBalance: { type: Number, default: 0 },

    entryDate: { type: Date, default: Date.now },

}, { timestamps: true });

const PaymentLedger = mongoose.model("PaymentLedger", PaymentLedgerSchema);
export default PaymentLedger;
