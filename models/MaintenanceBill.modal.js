import mongoose from "mongoose";

const maintenanceBillSchema = new mongoose.Schema({
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: "Landlord" },
  siteId: { type: mongoose.Schema.Types.ObjectId, ref: "Site" },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: "Unit" },
  fromDate: Date,
  toDate: Date,
  maintenanceAmount: Number,
  gstAmount: Number,
  totalAmount: Number,
  billingAmount: { type: Number, default: 0 },
  lastUpdatedDate: { type: String },
  status: { type: String, enum: ["Unpaid", "Paid"], default: "Unpaid" },
  generatedOn: { type: Date, default: Date.now },
  paymentStatus:{ type: String, enum: ["Pending", "Completed"], default: "Pending" },
  paymentId: String,
  paidAt: Date
});

maintenanceBillSchema.index({ siteId: 1, unitId: 1, landlordId: 1 });

const MaintenanceBill =
  mongoose.models.MaintenanceBill ||
  mongoose.model("MaintenanceBill", maintenanceBillSchema);
export default MaintenanceBill;
