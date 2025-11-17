import express from "express";
import {
  createOrder,
  getWalletHistory,
  payUsingWallet,
  verifyPayment,
} from "../../controllers/walletController.js";

const router = express.Router();

router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);
router.post("/pay-using-wallet", payUsingWallet);
router.get("/history/:landlordId", getWalletHistory);

export default router;
