import express from "express";
const router = express.Router();
import { authorizeRoles, protect } from "../../middleware/authMiddleware.js";

import { createSite, getAllSites, updateSite, deleteSite } from "../../controllers/siteControllers.js";

router.post("/", protect, authorizeRoles("admin"), createSite);
router.get("/", protect, authorizeRoles("admin"), getAllSites);
router.put("/:id", protect, authorizeRoles("admin"), updateSite);
router.delete("/:id", protect, authorizeRoles("admin"), deleteSite);

export default router;
