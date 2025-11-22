// routes/siteRoutes.js
import express from "express";
import {
  createStockItem,
//   decreaseStock,
  deleteStockItem,
  getStockItemById,
  getStockItems,
//   increaseStock,
  updateStockItem,
} from "../../controllers/Stock Management/stockInController.js";

const router = express.Router();

router.post("/", createStockItem);
router.put("/:id", updateStockItem);
router.get("/", getStockItems);
router.get("/:id", getStockItemById);
router.delete("/:id", deleteStockItem);
// router.post("/:id/increase", increaseStock);
// router.post("/:id/decrease", decreaseStock);

export default router;
