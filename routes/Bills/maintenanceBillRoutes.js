import express from "express";
import {
  createMaintenanceBill,
  deleteMaintenanceBill,
  generateMaintenanceBill,
  getAllMaintenanceBills,
  getAllMaintenanceBills1,
  getMaintenanceBillsByLandlord,
  getTodayMaintenanceForAll,
  updateMaintenanceBill,
} from "../../controllers/maintenanceBillController.js";

const router = express.Router();

// 🧾 Generate new bill
router.post("/generate", generateMaintenanceBill);
router.get("/getAllMaintenanceBills1", getAllMaintenanceBills1);
router.post("/createbill", createMaintenanceBill);
router.delete("/deleteMaintenanceBill/:id", deleteMaintenanceBill);

// 📋 Get all bills (with filters)
router.get("/", getAllMaintenanceBills);
router.get("/byDay", getTodayMaintenanceForAll);

router.put("/:billId", updateMaintenanceBill);

router.get("/landlord/:id/unit/:unitId", getMaintenanceBillsByLandlord);

export default router;
