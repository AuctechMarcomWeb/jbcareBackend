import express from "express";
import {
  addTenant,
  deleteTenant,
  getTenantById,
  getTenants,
  updateTenant,
} from "../../controllers/tenantController.js";

const router = express.Router();

router.post("/", addTenant);
router.get("/", getTenants);
router.get("/:id", getTenantById);
router.put("/:id", updateTenant);
router.delete("/:id", deleteTenant);

export default router;
