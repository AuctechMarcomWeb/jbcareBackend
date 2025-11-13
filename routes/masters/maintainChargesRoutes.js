import express from "express";
import {
  createMaintainCharge,
  createUserMaintainCharges,
  deleteMaintainCharge,
  getAllMaintainCharges,
  getFixedCharges,
  getMaintainChargeById,
  updateFixedChargeById,
  updateMaintainCharge,
} from "../../controllers/maintainChargeController.js";

const router = express.Router();

router.post("/", createMaintainCharge); // ➕ Add new
router.get("/", getAllMaintainCharges); // 📋 Get all
router.put("/:id", updateMaintainCharge); // ✏️ Update
router.delete("/:id", deleteMaintainCharge); // ❌ Delete
// POST /api/maintain-charges/create-dummy
router.post("/min-fix-charges", createUserMaintainCharges);
router.put("/update-min-fix-charges/:id", updateFixedChargeById);
router.get("/get-min-fix-charges", getFixedCharges)
router.get("/:id", getMaintainChargeById); // 🔍 Get single

export default router;
