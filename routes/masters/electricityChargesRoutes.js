import express from "express";
import {
  createElectricityCharge,
  getAllElectricityCharges,
  getElectricityChargeById,
  updateElectricityCharge,
  deleteElectricityCharge,
} from "../../controllers/electricityChargesController.js";

const router = express.Router();

// ➕ Add new / update existing electricity charge
router.post("/", createElectricityCharge);

// 📋 Get all electricity charges (with filters, pagination, search)
router.get("/", getAllElectricityCharges);

// 🔍 Get single electricity charge by ID
router.get("/:id", getElectricityChargeById);

// ✏️ Update electricity charge by ID
router.put("/:id", updateElectricityCharge);

// ❌ Delete electricity charge by ID
router.delete("/:id", deleteElectricityCharge);

export default router;
