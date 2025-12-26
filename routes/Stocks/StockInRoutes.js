
import express from "express";
import { createStockIn, deleteStockIn, getStockInCountStats, getStockInList, updateStockIn } from "../../controllers/stockInController.js";

const router = express.Router();

router.post("/", createStockIn);
router.get("/", getStockInList);
router.get("/getStockInCountStats", getStockInCountStats);
router.put("/:id", updateStockIn);
router.delete("/:id", deleteStockIn);

export default router;
