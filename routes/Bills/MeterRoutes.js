import express from "express";
import {
  getAllMeterLogs,
  getLatestMeterStatus,
  getMeterLogs,
  toggleMeter,
} from "../../controllers/meterController.js";

const router = express.Router();

router.get("/", getAllMeterLogs);
router.post("/toggle", toggleMeter);
router.get("/logs/:landlordId", getMeterLogs);
router.get("/status/:landlordId", getLatestMeterStatus);

export default router;
