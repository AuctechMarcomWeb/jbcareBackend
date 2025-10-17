import express from "express";
import { protect, authorizeRoles } from "../../middleware/authMiddleware.js";
import {
  createComplaint,
  updateComplaint,
  getAllComplaints,
} from "../../controllers/complaintControllers.js";

const router = express.Router();

// ------------------ ROUTES ------------------

// USER - Create complaint (Mobile App or Helpdesk)
router.post("/", createComplaint);

// SUPERVISOR / ADMIN - Update complaint (review, material demand, resolve, verify)
router.patch("/:id", updateComplaint);

// ADMIN / SUPERVISOR - Get complaints with filters & pagination
router.get("/", getAllComplaints);

export default router;
