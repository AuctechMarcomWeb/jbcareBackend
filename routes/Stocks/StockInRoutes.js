import express from "express";
import {
  createStockIn,
  deleteStockIn,
  getBrandListByProduct,
  getDateWiseStockIn,
  getStockInById,
  getStockInCountStats,
  getStockInList,
  getStockOutList,
  getStockSummary,
  getUniqueProductList,
  performStockOut,
  updateStockIn,
} from "../../controllers/stockInController.js";

const router = express.Router();

router.post("/", createStockIn);
router.get("/", getStockInList);
router.get("/getProductList", getUniqueProductList);
router.get("/stockOutList", getStockOutList);
router.get("/getBrandListByProduct", getBrandListByProduct);
router.get("/getDateWiseStockIn", getDateWiseStockIn);
router.post("/stockout", performStockOut);
router.get("/getStockSummary", getStockSummary);
router.get("/getStockInById/:id", getStockInById);
router.get("/getStockInCountStats", getStockInCountStats);
router.put("/:id", updateStockIn);
router.delete("/:id", deleteStockIn);

export default router;
