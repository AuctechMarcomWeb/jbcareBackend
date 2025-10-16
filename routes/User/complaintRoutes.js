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
router.post("/", createComplaint);

// SUPERVISOR - Review complaint
router.put(
  "/:id/review",

  reviewComplaint
);

router.put(
  "/:id/resolve",

  resolveComplaint
);

// ADMIN - Get all complaints
router.get("/", getAllComplaints);

export default router;
