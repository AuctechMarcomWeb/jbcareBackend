import express from "express";
import {
  createDemand,
  deleteDemand,
  getDemandById,
  getDemands,
  updateDemand,
  updateDemandStatus,
} from "../../controllers/Stock Management/stockDemandController.js";

const router = express.Router();

router.post("/", createDemand);
router.get("/", getDemands);
router.get("/:demandId", getDemandById);
router.put("/:demandId", updateDemand);
router.delete("/:demandId", deleteDemand);
// router.put("/restore/:demandId", restoreDemand);

// Status flow
router.put("/status/:demandId", updateDemandStatus);

export default router;
