import express from "express";
import {
  createProblemType,
  deleteProblemType,
  getProblemTypeById,
  getProblemTypes,
  updateProblemType,
} from "../../controllers/problemTypeController.js";

const router = express.Router();

router.post("/", createProblemType); // Create
router.get("/", getProblemTypes); // List
router.get("/:id", getProblemTypeById); // Get single
router.put("/:id", updateProblemType); // Update
router.delete("/:id", deleteProblemType); // Soft delete

export default router;
