import express from "express";
import {
  createWarehouse,
  deleteWarehouse,
  getWarehouses,
  updateWarehouse,
} from "../../controllers/Stock Management/warehouseController.js";

const router = express.Router();

router.post("/", createWarehouse); // Create
router.get("/", getWarehouses); // List
router.patch("/:id", updateWarehouse); // Get single
router.delete("/:id", deleteWarehouse); // Soft delete

export default router;
