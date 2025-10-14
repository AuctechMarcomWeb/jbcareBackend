import OTP from "../models/VerifyOTP.modal.js";
import User from "../models/User.modal.js";
import jwt from "jsonwebtoken";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

// Generate random 6-digit OTP
const generateOtpCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// Generate JWT token
const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

// Send OTP to phone (for now, return in response; replace with SMS provider later)
export const sendOtp = async (req, res) => {
  const { phone } = req.body;
  if (!phone)
    return res.status(400).json({ message: "Phone number is required" });

  try {
    // Check if user exists
    let user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min validity

    // Check if OTP already exists for this phone
    let otpEntry = await OTP.findOne({ phone });
    if (otpEntry) {
      otpEntry.otp = otpCode;
      otpEntry.expiresAt = expiresAt;
      await otpEntry.save();
    } else {
      await OTP.create({ phone, otp: otpCode, expiresAt });
    }

    // Here you would send OTP via SMS provider
    console.log(`OTP for ${phone}: ${otpCode}`);

    return sendSuccess(res, "OTP sent successfully", { phone, otpCode }, 200);
  } catch (error) {
    return sendError(res, "Failed to send OTP", 500, error.message);
  }
};

// Verify OTP
export const verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp)
    return res.status(400).json({ message: "Phone and OTP required" });

  try {
    const otpEntry = await OTP.findOne({ phone });
    if (!otpEntry)
      return res.status(400).json({ message: "OTP not found or expired" });

    if (otpEntry.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    // OTP verified, delete OTP
    await OTP.deleteOne({ _id: otpEntry._id });

    // Find user
    const user = await User.findOne({ phone });
    const token = generateToken(user);
    const responseData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      token,
    };

    // ✅ Unified success response
    return sendSuccess(
      res,
      "OTP verified, login successful",
      responseData,
      200
    );
  } catch (error) {
    return sendError(res, "OTP verification failed", 500, error.message);
  }
};
