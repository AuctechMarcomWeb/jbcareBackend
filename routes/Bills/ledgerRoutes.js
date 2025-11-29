import express from "express";
import { getAllLedgers } from "../../controllers/ledgerController.js";


const router = express.Router();

router.get("/", getAllLedgers);
// router.get("/logs/:landlordId", getMeterLogs);
// router.get("/status/:landlordId", getLatestMeterStatus);

export default router;
