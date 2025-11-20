import express from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "../../controllers/Stock Management/categoryController.js";

const router = express.Router();

router.post("/", createCategory); // Create
router.get("/", getCategories); // List
router.patch("/:id", updateCategory); // Get single
router.delete("/:id", deleteCategory); // Soft delete

export default router;
