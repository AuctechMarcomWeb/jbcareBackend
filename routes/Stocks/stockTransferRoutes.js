import express from "express";
import {
  getAllTransferLogs,
  transferStock,
} from "../../controllers/Stock Management/stockTransferController.js";

const router = express.Router();

router.get("/", transferStock);
router.get("/logs", getAllTransferLogs);

export default router;
