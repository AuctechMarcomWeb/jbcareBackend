import express from "express";
import {
  createComplaint,
  reviewComplaint,
  resolveComplaint,
  getAllComplaints,
} from "../../controllers/complaintControllers.js";
import { authorizeRoles, protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

// USER - Create complaint
router.post("/", protect, createComplaint);

// SUPERVISOR - Review complaint
router.put(
  "/:id/review",
  protect,
  authorizeRoles("supervisor"),
  reviewComplaint
);

// SUPERVISOR/ADMIN - Mark complaint resolved
router.put(
  "/:id/resolve",
  protect,
  authorizeRoles("supervisor", "admin"),
  resolveComplaint
);

// ADMIN - Get all complaints
router.get("/", protect, authorizeRoles("admin"), getAllComplaints);

export default router;
