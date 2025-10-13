import express from "express";
const router = express.Router();
import {
  createUnitType,
  getAllUnitTypes,
  updateUnitType,
  deleteUnitType,
} from "../../controllers/unitTypeController.js";
import { authorizeRoles, protect } from "../../middleware/authMiddleware.js";

router.post("/", protect, authorizeRoles("admin"), createUnitType);
router.get("/", protect, authorizeRoles("admin"), getAllUnitTypes);
router.put("/:id", protect, authorizeRoles("admin"), updateUnitType);
router.delete("/:id", protect, authorizeRoles("admin"), deleteUnitType);

export default router;
