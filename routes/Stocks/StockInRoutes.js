
import express from "express";
import { createStockIn, deleteStockIn, getStockInList, updateStockIn } from "../../controllers/stockInController.js";

const router = express.Router();

router.post("/", createStockIn);
router.get("/", getStockInList);
router.put("/:id", updateStockIn);
router.delete("/:id", deleteStockIn);

export default router;
