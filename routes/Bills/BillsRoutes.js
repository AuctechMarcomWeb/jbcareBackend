import express from "express";
import { createBill, createBillForAll, deleteBill, getAllBills, getBillById, getBillingSummary, updateBill, updateBillStatus } from "../../controllers/BillsController.js";


const router = express.Router();

router.post("/", createBill);
router.post("/createBillForAll", createBillForAll);
router.patch("/updateStatus/:billId", updateBillStatus);
router.get("/", getAllBills);
router.get("/getBillingSummary", getBillingSummary);
router.get("/:id", getBillById);
router.put("/:id", updateBill);
router.delete("/:id", deleteBill);

export default router;
