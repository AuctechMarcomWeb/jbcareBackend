import express from "express";
import {
  addLandlord,
  deleteLandlord,
  getLandlordById,
  getLandlords,
  updateLandlord,
} from "../../controllers/landlordController.js";

const router = express.Router();

router.post("/", addLandlord);
router.get("/", getLandlords);
router.get("/:id", getLandlordById);
router.put("/:id", updateLandlord);
router.delete("/:id", deleteLandlord);

export default router;
