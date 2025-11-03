import express from "express";
import { forgotPassword, login, register, resetPassword, verifyOTP } from "../../controllers/authControllers.js";
import { sendOtp, verifyOtp } from "../../controllers/otpControllers.js";
import { protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// OTP login
router.post("/otp/send", sendOtp);
router.post("/otp/verify", verifyOtp);

router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

export default router;
