import express from "express";
import {
  addLandlord,
  deleteLandlord,
  getLandlordById,
  getLandlords,
  updateLandlord,
  updateLandlordStatus,
} from "../../controllers/landlordController.js";

const router = express.Router();

router.post("/", addLandlord);
router.get("/", getLandlords);
router.get("/:id", getLandlordById);
router.put("/:id", updateLandlord);
router.patch("/updateLandlordStatus/:landlordId", updateLandlordStatus);

router.delete("/:id", deleteLandlord);

export default router;
