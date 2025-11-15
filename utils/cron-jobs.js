import cron from "node-cron";
import { generateMonthlyBills } from "../controllers/BillingController.js";

// Every month on 30th at 23:59
cron.schedule("59 23 30 * *", async () => {
  console.log("🧾 Auto-generating monthly bills...");
  await generateMonthlyBills();
});

