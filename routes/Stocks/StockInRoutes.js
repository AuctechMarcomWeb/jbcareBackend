import express from "express";
import {
  createStockIn,
  deleteStockIn,
  getStockInCountStats,
  getStockInList,
  performStockOut,
  updateStockIn,
} from "../../controllers/stockInController.js";

const router = express.Router();

router.post("/", createStockIn);
router.post("/stockout", performStockOut);
router.get("/", getStockInList);
router.get("/getStockInCountStats", getStockInCountStats);
router.put("/:id", updateStockIn);
router.delete("/:id", deleteStockIn);

export default router;
