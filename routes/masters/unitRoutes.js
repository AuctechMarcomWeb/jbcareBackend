import express from "express";
const router = express.Router();
import { authorizeRoles, protect } from "../../middleware/authMiddleware.js";

import {
  createUnit,
  getAllUnits,
  updateUnit,
  deleteUnit,
} from "../../controllers/unitController.js";

router.post("/", createUnit);
router.get("/", getAllUnits);
router.put("/:id", updateUnit);
router.delete("/:id", deleteUnit);

export default router;
