import express from "express";
const router = express.Router();

import {
    createFixElectricityCharges,
    getAllFixElectricityCharges,
    updateFixElectricityCharges,
    deleteFixElectricityCharges,
} from "../../controllers/FixElectricityChargesController.js";

import { authorizeRoles, protect } from "../../middleware/authMiddleware.js";

router.post("/", createFixElectricityCharges);

router.get("/", getAllFixElectricityCharges);

router.put("/:id", updateFixElectricityCharges);

router.delete("/:id", deleteFixElectricityCharges);

export default router;
