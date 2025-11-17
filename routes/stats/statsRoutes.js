// routes/siteRoutes.js
import express from "express";
import {
  getBillingSummary,
  getComplaintStats,
  getSiteUnitCounts,
} from "../../controllers/statsController.js";

const router = express.Router();

router.get("/unit-stats", getSiteUnitCounts);
router.get("/billing-stats", getBillingSummary);
router.get("/complaint-stats", getComplaintStats);

export default router;
