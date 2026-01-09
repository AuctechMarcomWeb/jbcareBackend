import express from "express";
import {
    addTenantWalletPayment,
    addWalletPayment,
    createBillsPayment,
    deleteBillsPayment,
    getAllBillsPayments,
    getBillsPaymentById,
    payBillbyAdmin,
    payBillFromLanlordWallet,
    payByLandlordOnline,
    updateBillsPayment,
    verifyRazorpayPayment,
    verifyRazorpayPaymentForTenantWallet,
    verifyRazorpayPaymentForWallet
} from "../../controllers/BillPaymentsController.js";



const router = express.Router();

router.post("/create", createBillsPayment);
router.post("/payByLanlord", payBillFromLanlordWallet);
router.post("/payByAdmin", payBillbyAdmin);
router.post("/payByLanlordOnline", payByLandlordOnline);
router.post("/verifyLanlordPayment", verifyRazorpayPayment);
router.post("/addWalletPayment", addWalletPayment);
router.post("/verifyRazorpayPaymentForWallet", verifyRazorpayPaymentForWallet);
router.post("/addTenantWalletPayment", addTenantWalletPayment);
router.post("/verifyRazorpayPaymentForTenantWallet", verifyRazorpayPaymentForTenantWallet);

router.get("/all", getAllBillsPayments);

router.get("/get/:paymentId", getBillsPaymentById);

router.put("/update/:paymentId", updateBillsPayment);

router.delete("/delete/:paymentId", deleteBillsPayment);

export default router;
