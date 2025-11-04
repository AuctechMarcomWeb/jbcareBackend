import express from "express";
import {
  generateMaintenanceBill,
  getAllMaintenanceBills,
  getMaintenanceBillsByLandlord,
  getTodayMaintenanceForAll,
  updateMaintenanceBill,
} from "../../controllers/maintenanceBillController.js";

const router = express.Router();

// 🧾 Generate new bill
router.post("/generate", generateMaintenanceBill);

// 📋 Get all bills (with filters)
router.get("/", getAllMaintenanceBills);
router.get("/byDay", getTodayMaintenanceForAll);

router.put("/:billId", updateMaintenanceBill);

router.get("/landlord/:id", getMaintenanceBillsByLandlord);

export default router;
