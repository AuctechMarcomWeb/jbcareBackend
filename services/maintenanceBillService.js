import MaintenanceBill from "../models/MaintenanceBill.modal.js";
import MaintainCharges from "../models/MantainCharge.modal.js";
import Unit from "../models/masters/Unit.modal.js";

/**
 * 🧾 Core Logic for Generating Maintenance Bill
 * (Can be used by both routes and cron jobs)
 */
export const generateMaintenanceBillCore = async ({
  siteId,
  unitId,
  landlordId,
  billingCycle = "monthly",
}) => {
  console.log("Data received on every bill generations", {
    siteId,
    unitId,
    landlordId,
    billingCycle,
  });

  try {
    if (!siteId || !unitId || !landlordId) {
      throw new Error("Missing required fields (siteId, unitId, landlordId)");
    }

    // 🔹 1. Fetch active maintenance charge
    const charge = await MaintainCharges.findOne({
      siteId,
      unitId,
      isActive: true,
    }).sort({ effectiveFrom: -1 });

    if (!charge) {
      throw new Error("No active maintenance charge found for this unit.");
    }

    // 🔹 2. Determine billing period (current month)
    const now = new Date();
    const fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 🔹 3. Skip if bill for this period already exists
    const existingBill = await MaintenanceBill.findOne({
      siteId,
      unitId,
      landlordId,
      fromDate: { $lte: toDate },
      toDate: { $gte: fromDate },
    });

    if (existingBill) {
      return {
        success: false,
        message: "Bill for this month already exists",
        data: existingBill,
      };
    }

    // 🔹 4. Determine months in cycle
    const cycleMonths =
      billingCycle === "quarterly" ? 3 : billingCycle === "annual" ? 12 : 1;

    // 🔹 5. Calculate maintenance amount
    let maintenanceAmount = 0;
    if (charge.rateType === "per_sqft") {
      const unit = await Unit.findById(unitId);
      if (!unit?.areaSqFt) {
        throw new Error(
          "Unit size (areaSqFt) not found for per_sqft calculation."
        );
      }
      maintenanceAmount = charge.rateValue * unit.areaSqFt * cycleMonths;
    } else {
      maintenanceAmount = charge.rateValue * cycleMonths;
    }

    // 🔹 6. Calculate GST and total
    const gstAmount = (maintenanceAmount * charge.gstPercent) / 100;
    const totalAmount = maintenanceAmount + gstAmount;

    // 🔹 7. Save new bill
    const newBill = new MaintenanceBill({
      landlordId,
      siteId,
      unitId,
      fromDate,
      toDate,
      maintenanceAmount: Number(maintenanceAmount.toFixed(2)),
      gstAmount: Number(gstAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      status: "Unpaid",
      generatedOn: new Date(),
    });

    console.log("💾 Attempting to save new bill:", {
      siteId,
      unitId,
      landlordId,
      maintenanceAmount,
      gstAmount,
      totalAmount,
    });

    await newBill.save();
    console.log("✅ Bill saved successfully in DB");
    const count = await MaintenanceBill.countDocuments();
    console.log("📊 Total bills in DB after generation:", count);

    return {
      success: true,
      message: "Maintenance bill generated successfully",
      data: newBill,
    };
  } catch (error) {
  console.error("❌ Error during bill generation:", error);
  return {
    success: false,
    message: error.message,
  };
}
};
