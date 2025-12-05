import express from "express";
import {
    createBillsPayment,
    deleteBillsPayment,
    getAllBillsPayments,
    getBillsPaymentById,
    payBillbyAdmin,
    payBillFromLanlordWallet,
    payByLandlordOnline,
    updateBillsPayment,
    verifyRazorpayPayment
} from "../../controllers/BillPaymentsController.js";



const router = express.Router();

router.post("/create", createBillsPayment);
router.post("/payByLanlord", payBillFromLanlordWallet);
router.post("/payByAdmin", payBillbyAdmin);
router.post("/payByLanlordOnline", payByLandlordOnline);
router.post("/verifyLanlordPayment", verifyRazorpayPayment);

router.get("/all", getAllBillsPayments);

router.get("/get/:paymentId", getBillsPaymentById);

router.put("/update/:paymentId", updateBillsPayment);

router.delete("/delete/:paymentId", deleteBillsPayment);

export default router;
