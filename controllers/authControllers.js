import User from "../models/User.modal.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

// helper to create token
const createToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { name, email, phone, gender, address, role, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, phone and password are required" });
    }

    const exists = await User.findOne({ email });
    if (exists)
      return res
        .status(400)
        .json({ message: "User already exists with this email" });

    const user = await User.create({
      name,
      email,
      phone,
      gender,
      address,
      role,
      password,
    });

    const token = createToken(user._id);
    // Structure response data
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

    // Send unified success response
    return sendSuccess(res, "User registered successfully", responseData, 201);
  } catch (err) {
    return sendError(res, "Registration failed", 500, err.message);
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  console.log("Login attempt made");

  try {
    const { email, phone, password } = req.body;

    console.log("User login details", email, phone, password);
    // Require password + either email or phone
    if ((!email && !phone) || !password) {
      return res
        .status(400)
        .json({ message: "Provide email or phone and password" });
    }

    // Find user by email or phone
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else if (phone) {
      user = await User.findOne({ phone });
    }

    console.log("User found with the entered email/password", user);

    if (!user) return res.status(401).json({ message: "Invalid credentials" });


    const isMatch = await bcrypt.compare(password, user.password);
    console.log("password matched or not", isMatch);

    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = createToken(user._id);

    // Prepare user data
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

    // Send unified success response
    return sendSuccess(res, "Login successful", responseData, 200);
  } catch (err) {
    return sendError(res, "Login failed", 500, err.message);
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return sendError(res, "Email is required", 400);

    const user = await User.findOne({ email });
    if (!user) return sendError(res, "User not found", 404);

    // 🔹 Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 🔹 Hash OTP before saving (for security)
    const hashedOTP = await bcrypt.hash(otp, 10);

    // 🔹 Save OTP + expiry (10 minutes)
    user.resetPasswordOTP = hashedOTP;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 min
    await user.save();

    // 🔹 Send email using nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    transporter.verify((error, success) => {
      if (error) {
        console.error("SMTP connection failed:", error);
      } else {
        console.log("SMTP server is ready to take messages");
      }
    });

    const mailOptions = {
      from: `"Support Team" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: "Password Reset Verification Code",
      html: `
        <h2>Forgot Password</h2>
        <p>Hello ${user.name || "User"},</p>
        <p>Your password reset verification code is:</p>
        <h1 style="color:#007bff;">${otp}</h1>
        <p>This code will expire in <strong>10 minutes</strong>.</p>
        <p>If you didn’t request this, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return sendSuccess(
      res,
      "Verification code sent successfully to your email"
    );
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return sendError(res, "Failed to send OTP", 500, error.message);
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return sendError(res, "Email and OTP are required", 400);

    const user = await User.findOne({ email });
    if (!user) return sendError(res, "User not found", 404);

    if (!user.resetPasswordOTP || !user.resetPasswordExpires)
      return sendError(res, "No OTP found. Please request a new one.", 400);

    // 🔹 Check expiry
    if (user.resetPasswordExpires < Date.now())
      return sendError(res, "OTP expired. Please request a new one.", 400);

    // 🔹 Verify OTP
    const isMatch = await bcrypt.compare(otp, user.resetPasswordOTP);
    if (!isMatch) return sendError(res, "Invalid OTP", 400);

    // ✅ OTP valid
    user.resetPasswordOTP = null; // clear OTP after verification
    await user.save();

    return sendSuccess(
      res,
      "OTP verified successfully, you can reset your password now"
    );
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return sendError(res, "OTP verification failed", 500, error.message);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword)
      return sendError(res, "Email and new password are required", 400);

    const user = await User.findOne({ email });
    if (!user) return sendError(res, "User not found", 404);

    // ✅ Just assign plain password, pre-save hook will hash automatically
    user.password = newPassword;
    user.resetPasswordOTP = null;
    user.resetPasswordExpires = null;

    await user.save();

    return sendSuccess(res, "Password reset successfully", null, 200);
  } catch (error) {
    console.error("Reset Password Error:", error);
    return sendError(res, "Failed to reset password", 500, error.message);
  }
};

