import express from "express";
import {
  getLatestMeterStatus,
  getMeterLogs,
  toggleMeter,
} from "../../controllers/meterController.js";

const router = express.Router();

router.post("/toggle", toggleMeter);
router.get("/logs/:landlordId", getMeterLogs);
router.get("/status/:landlordId", getLatestMeterStatus);

export default router;
