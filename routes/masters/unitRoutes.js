import express from "express";
const router = express.Router();
import { authorizeRoles, protect } from "../../middleware/authMiddleware.js";

import { createUnit, getAllUnits, updateUnit, deleteUnit } from "../../controllers/unitController.js";

router.post("/", protect, authorizeRoles("admin"), createUnit);
router.get("/", protect, authorizeRoles("admin"), getAllUnits);
router.put("/:id", protect, authorizeRoles("admin"), updateUnit);
router.delete("/:id", protect, authorizeRoles("admin"), deleteUnit);

export default router;