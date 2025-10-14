import express from "express";
const router = express.Router();
import { authorizeRoles, protect } from "../../middleware/authMiddleware.js";

import {
  createProject,
  getAllProjects,
  updateProject,
  deleteProject,
} from "../../controllers/projectControllers.js";
router.post("/", createProject);
router.get("/", getAllProjects);
router.put("/:id", updateProject);
router.delete("/:id", deleteProject);

export default router;
