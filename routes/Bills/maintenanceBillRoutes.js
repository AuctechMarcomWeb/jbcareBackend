import express from "express";
import {
  generateMaintenanceBill,
  getAllMaintenanceBills,
} from "../../controllers/maintenanceBillController.js";

const router = express.Router();

// 🧾 Generate new bill
router.post("/generate", generateMaintenanceBill);

// 📋 Get all bills (with filters)
router.get("/", getAllMaintenanceBills);

export default router;
