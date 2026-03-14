import express from "express";
import {

  getStockTransferList,
  transferStock,
} from "../../controllers/Stock Management/stockTransferController.js";

const router = express.Router();

router.get("/", transferStock);

router.get("/stockTransferList", getStockTransferList);

export default router;
