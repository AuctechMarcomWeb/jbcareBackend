import express from "express";
import {
  createBilling,
  deleteAllBillings,
  deleteBilling,
  getAllBillings,
  getAllLandlordsBillingSummary,
  getBillingById,
  updateBilling,
} from "../../controllers/BillingController.js";

const router = express.Router();

router.post("/", createBilling); // Create
router.get("/billingSummary", getAllLandlordsBillingSummary); // Delete all (optional)
router.get("/", getAllBillings); // Read all (with filters)
router.get("/:id", getBillingById); // Read one
router.put("/:id", updateBilling); // Update
router.delete("/:id", deleteBilling); // Delete one
router.delete("/", deleteAllBillings); // Delete all (optional)

export default router;
