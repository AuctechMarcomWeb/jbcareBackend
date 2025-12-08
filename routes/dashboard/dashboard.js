import express from "express";
import { getDashboardStats, getDashboardSummary } from "../../controllers/dashboardController.js";


const router = express.Router();

router.get("/", getDashboardStats); // Create
router.get("/mainDashboard", getDashboardSummary); // Create


export default router;
