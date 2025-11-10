import cron from "node-cron";
import Unit from "../models/masters/Unit.modal.js";
import Landlord from "../models/LandLord.modal.js";
import { generateMaintenanceBillCore } from "../services/maintenanceBillService.js";
import CronLog from "../models/utilsSchemas/CronLogs.modal.js";

/**
 * 🕐 Monthly Auto Maintenance Bill Generator
 * Runs on the 1st day of every month at midnight
 */
cron.schedule("0 0 1 * *", async () => {
  console.log(
    "🧾 [CRON] Running automatic maintenance bill generation (Landlord-based)..."
  );

  try {
    // 1️⃣ Fetch all active landlords with siteId & unitIds assigned
    const activeLandlords = await Landlord.find({
      isActive: true,
      siteId: { $exists: true, $ne: null },
      unitIds: { $exists: true, $ne: [] },
    }).select("_id siteId unitIds");

    if (!activeLandlords.length) {
      console.log("⚠️ No active landlords found for bill generation.");
      return;
    }

    console.log(
      `👷 Found ${activeLandlords.length} active landlords. Starting bill generation...`
    );

    // 2️⃣ Loop through each landlord
    for (const landlord of activeLandlords) {
      try {
        const unitId = Array.isArray(landlord.unitIds)
          ? landlord.unitIds[0]
          : landlord.unitIds;

        // 3️⃣ Call the reusable service
        const bill = await generateMaintenanceBillCore({
          siteId: landlord.siteId,
          unitId,
          landlordId: landlord._id,
          billingCycle: "monthly",
        });

        console.log(
          `✅ Bill generated for Landlord ${landlord._id} (Unit: ${unitId}, Site: ${landlord.siteId}, bill:${bill})`
        );
      } catch (err) {
        console.error(`❌ Failed for Landlord ${landlord._id}:`, err.message);
      }
    }

    console.log(
      "🎉 Monthly maintenance bill generation completed for all landlords."
    );
  } catch (error) {
    console.error("❌ [CRON] Bill generation failed:", error.message);
  }
});
