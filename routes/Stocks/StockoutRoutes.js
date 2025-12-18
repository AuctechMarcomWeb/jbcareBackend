import express from "express";
import {
    createStockOut,
    getStockOutList,
    updateStockOut,
    deleteStockOut,
} from "../../controllers/stockOutController.js";

const router = express.Router();

router.post("/", createStockOut);
router.get("/", getStockOutList);
router.put("/:id", updateStockOut);
router.delete("/:id", deleteStockOut);

export default router;
