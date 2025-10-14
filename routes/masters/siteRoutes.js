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
router.post("/", createSite);
router.get("/:role", getAllSites);
router.put("/:id", updateSite);
router.delete("/:id", deleteSite);

export default router;
