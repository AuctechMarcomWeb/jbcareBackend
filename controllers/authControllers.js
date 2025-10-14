import User from "../models/User.modal.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
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
  try {
    const { email, phone, password } = req.body;

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

    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
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
