import express from "express";
import {
  createStockIn,
  deleteStockIn,
  getDateWiseStockIn,
  getStockInById,
  getStockInCountStats,
  getStockInList,
  getStockSummary,
  performStockOut,
  updateStockIn,
} from "../../controllers/stockInController.js";

const router = express.Router();

router.post("/", createStockIn);
router.get("/getDateWiseStockIn", getDateWiseStockIn);
router.post("/stockout", performStockOut);
router.get("/", getStockInList);
router.get("/getStockSummary", getStockSummary);
router.get("/getStockInById/:id", getStockInById);
router.get("/getStockInCountStats", getStockInCountStats);
router.put("/:id", updateStockIn);
router.delete("/:id", deleteStockIn);

export default router;
