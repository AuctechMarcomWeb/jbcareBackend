import express from "express";
import { getAllLedgers, getConsolidatedPayable } from "../../controllers/ledgerController.js";

const router = express.Router();

router.get("/", getAllLedgers);
router.get("/consolidated/:landlordId", getConsolidatedPayable);

// router.get("/logs/:landlordId", getMeterLogs);
// router.get("/status/:landlordId", getLatestMeterStatus);

export default router;
