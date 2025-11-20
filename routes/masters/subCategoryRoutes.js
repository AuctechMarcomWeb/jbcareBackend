import express from "express";
import {
  createSubCategory,
  deleteSubCategory,
  getSubCategories,
  updateSubCategory,
} from "../../controllers/Stock Management/subCategoryController.js";

const router = express.Router();

router.post("/", createSubCategory); // Create
router.get("/", getSubCategories); // List
router.patch("/:id", updateSubCategory); // Get single
router.delete("/:id", deleteSubCategory);

export default router;
