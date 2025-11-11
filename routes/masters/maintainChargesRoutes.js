import express from "express";
import {
  createMaintainCharge,
  createUserMaintainCharges,
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
// POST /api/maintain-charges/create-dummy
router.post("/min-fix-charges", createUserMaintainCharges);

export default router;
