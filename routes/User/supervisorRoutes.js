import express from "express";
import { createSupervisor, deleteSupervisor, getSupervisorById, getSupervisors, updateSupervisor } from "../../controllers/supervisorControllers.js";


const router = express.Router();

router.post("/", createSupervisor);
router.get("/", getSupervisors);
router.get("/:id", getSupervisorById);
router.put("/:id", updateSupervisor);
router.delete("/:id", deleteSupervisor);

export default router;
