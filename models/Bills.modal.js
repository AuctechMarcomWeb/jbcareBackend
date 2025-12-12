

import mongoose from "mongoose";

const electricityBreakupSchema = new mongoose.Schema({
    previousReading: { type: Number, required: true },
    currentReading: { type: Number, required: true },
    consumedUnits: { type: Number, required: true },
    dgPreviousReading: { type: Number, required: true },
    dgCurrentReading: { type: Number, required: true },
    dgConsumedUnits: { type: Number, required: true },
    tariffRate: { type: Number, required: true },
    dgTariff: { type: Number, default: 0 },
    surchargePercent: { type: Number, default: 0 },
    electricityAmount: { type: Number, required: true },
    dgAmount: { type: Number, default: 0 },
    surchargeAmount: { type: Number, default: 0 },
});

const statusLogSchema = new mongoose.Schema({
    oldStatus: { type: String },
    newStatus: { type: String },
    remark: { type: String },
    changedAt: { type: Date, default: Date.now }
});

const maintenanceBreakupSchema = new mongoose.Schema({
    rateType: { type: String, },
    fixedAmount: { type: Number, default: 0 },
    SqftRate: { type: Number, default: 0 },
    SqftArea: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 0 },
    SqftAmount: { type: Number, default: 0 },
    maintenanceAmount: { type: Number, required: true },
});

const BillsSchema = new mongoose.Schema({
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: "Landlord" },
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: "Site" },
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: "Unit" },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
    fromDate: Date,
    toDate: Date,

    electricity: electricityBreakupSchema,
    maintenance: maintenanceBreakupSchema,


    totalAmount: { type: Number, default: 0 },
    lastUpdatedDate: { type: String },
    billTo: { type: String, default: "landlord" },

    status: { type: String, enum: ["Unpaid", "Under Process", "Paid"], default: "Unpaid" },
    statusLog: [statusLogSchema],
    generatedOn: { type: Date, default: Date.now },

    paymentMode: String,
    paymentId: String,
    paidAt: Date,
    paidBy: String,
    payerId: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });

const Bills = mongoose.model("Bills", BillsSchema);
export default Bills;
