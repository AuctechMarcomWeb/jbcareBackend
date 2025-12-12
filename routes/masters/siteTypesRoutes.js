import express from "express";
const router = express.Router();

import {
    createSiteType,
    getAllSiteTypes,
    updateSiteType,
    deleteSiteType,
} from "../../controllers/SiteTypeController.js";

// If you want auth later, keep middleware imports ready
// import { authorizeRoles, protect } from "../../middleware/authMiddleware.js";

router.post("/", createSiteType);
router.get("/", getAllSiteTypes);
router.put("/:id", updateSiteType);
router.delete("/:id", deleteSiteType);

export default router;
