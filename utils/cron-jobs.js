import cron from "node-cron";
import { generateMonthlyBills } from "../controllers/BillingController.js";
import { triggerComplaintBuzzer } from "../controllers/complaintControllers.js";

// Every month on 30th at 23:59
cron.schedule("* * * * *", async () => {
  console.log("🧾 Auto-generating monthly bills...");
  await generateMonthlyBills();
});

cron.schedule("0 1 * * *", async () => {
  try {
    console.log("Running daily buzzer check...");

    await triggerComplaintBuzzer();

    console.log("Buzzer check completed.");
  } catch (err) {
    console.error("Cron Error:", err.message);
  }
});
