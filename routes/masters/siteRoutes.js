import express from "express";
const router = express.Router();
import { authorizeRoles } from "../../middleware/authMiddleware.js";

import {
  createSite,
  getAllSites,
  updateSite,
  deleteSite,
} from "../../controllers/siteControllers.js";

// Role-based access only, no token required
router.post("/", authorizeRoles("admin"), createSite);
router.get("/:role", authorizeRoles("admin"), getAllSites);
router.put("/:id", authorizeRoles("admin"), updateSite);
router.delete("/:id", authorizeRoles("admin"), deleteSite);

export default router;
