import express from "express";
const router = express.Router();
import {
  createUnitType,
  getAllUnitTypes,
  updateUnitType,
  deleteUnitType,
} from "../../controllers/unitTypeController.js";
import { authorizeRoles, protect } from "../../middleware/authMiddleware.js";

router.post("/", createUnitType);
router.get("/", getAllUnitTypes);
router.put("/:id", updateUnitType);
router.delete("/:id", deleteUnitType);

export default router;
