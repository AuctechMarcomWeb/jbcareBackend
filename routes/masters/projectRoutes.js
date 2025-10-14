import express from "express";
const router = express.Router();
import { authorizeRoles, protect } from "../../middleware/authMiddleware.js";

import {
  createProject,
  getAllProjects,
  updateProject,
  deleteProject,
} from "../../controllers/projectControllers.js";
router.post("/", protect, authorizeRoles("admin"), createProject);
router.get("/", protect, authorizeRoles("admin"), getAllProjects);
router.put("/:id", protect, authorizeRoles("admin"), updateProject);
router.delete("/:id", protect, authorizeRoles("admin"), deleteProject);

export default router;
