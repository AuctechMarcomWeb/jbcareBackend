import mongoose from "mongoose";

const BillingSchema = new mongoose.Schema({
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: "Landlord" },
  siteId: { type: mongoose.Schema.Types.ObjectId, ref: "Site" },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: "Unit" },
  fromDate: Date,
  toDate: Date,
  maintenanceAmount: Number,
  electricityAmount: Number,
  gstAmount: Number,
  totalAmount: Number,
  billingAmount: { type: Number, default: 0 },
  lastUpdatedDate: { type: String },
  status: { type: String, enum: ["Unpaid", "Paid"], default: "Unpaid" },
  generatedOn: { type: Date, default: Date.now },

  paymentId: String,
  paidAt: Date,
  paidBy: String,
  payerId: { type: mongoose.Schema.Types.ObjectId },
});

const Billing = mongoose.model("Billing", BillingSchema);
export default Billing;



