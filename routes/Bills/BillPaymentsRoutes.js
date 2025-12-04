import express from "express";
import {
    createBillsPayment,
    deleteBillsPayment,
    getAllBillsPayments,
    getBillsPaymentById,
    updateBillsPayment
} from "../../controllers/BillPaymentsController.js";



const router = express.Router();

router.post("/create", createBillsPayment);

router.get("/all", getAllBillsPayments);

router.get("/get/:paymentId", getBillsPaymentById);

router.put("/update/:paymentId", updateBillsPayment);

router.delete("/delete/:paymentId", deleteBillsPayment);

export default router;
