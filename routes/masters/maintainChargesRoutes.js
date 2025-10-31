import express from "express";
import {
  createMaintainCharge,
  deleteMaintainCharge,
  getAllMaintainCharges,
  getMaintainChargeById,
  updateMaintainCharge,
} from "../../controllers/maintainChargeController.js";

const router = express.Router();

router.post("/", createMaintainCharge); // ➕ Add new
router.get("/", getAllMaintainCharges); // 📋 Get all
router.get("/:id", getMaintainChargeById); // 🔍 Get single
router.put("/:id", updateMaintainCharge); // ✏️ Update
router.delete("/:id", deleteMaintainCharge); // ❌ Delete

export default router;
