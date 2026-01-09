import mongoose from "mongoose";

const BillsPaymentsSchema = new mongoose.Schema(
    {
        landlordId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Landlord",
        },
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tenant",
        },

        siteId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Site",
            required: true,
        },

        unitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Unit",
            required: true,
        },
        billId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Bills",
        },

        totalAmount: { type: Number, required: true },

        razorpayOrderId: { type: String },
        remark: { type: String },

        razorpayPaymentId: { type: String },
        razorpaySignature: { type: String },

        status: {
            type: String,
            enum: ["Pending", "Failed", "Success", "Refunded"],
            default: "Pending",
        },


        paymentMode: {
            type: String,
        },

        paidAt: { type: Date },
        paidBy: { type: String },
        payerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        lastUpdatedDate: { type: Date, default: Date.now },
        chequeNumber: { type: String },
        refundId: { type: String },
        refundAmount: { type: Number },
        refundStatus: {
            type: String,
            enum: ["None", "Initiated", "Processed"],
            default: "None",
        },
    },
    { timestamps: true }
);

const BillsPayments = mongoose.model("BillsPayments", BillsPaymentsSchema);
export default BillsPayments;
