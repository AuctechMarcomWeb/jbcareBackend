import User from "../models/User.modal.js";
import bcrypt from "bcryptjs";
import Tenant from "../models/Tenant.modal.js";
import Landlord from "../models/LandLord.modal.js";
import Supervisor from "../models/Supervisors.modal.js";

import { sendError, sendSuccess } from "../utils/responseHandler.js";
import mongoose from "mongoose";

// Create user (admin only) - alternative to register route
export const createUser = async (req, res) => {
  try {
    const { name, email, phone, gender, address, role, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, phone and password required" });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      phone,
      gender,
      address,
      role,
      password: hashed,
    });
    res.status(201).json({
      message: "User created",
      user: { ...user.toObject(), password: undefined },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating user", error: err.message });
  }
};

// GET /api/users?role=landlord&name=mehdi&page=1&limit=10&sortBy=createdAt&order=desc&isPagination=true
export const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      name,
      phone,
      email,
      siteId,
      unitId,
      projectId,
      createdBy,
      isActive,
      startDate,
      endDate,
      sortBy = "createdAt",
      order = "desc",
      isPagination = "true", // default to true
    } = req.query;

    const query = {};

    // Role filter supports multiple roles
    if (role) {
      const roles = role.split(","); // supports "landlord,tenant"
      query.role = { $in: roles };
    }
    // 🧩 Filters
    if (role) query.role = role;

    if (name) query.name = { $regex: name, $options: "i" };
    if (phone) query.phone = { $regex: phone, $options: "i" };
    if (email) query.email = { $regex: email, $options: "i" };
    if (siteId) query.siteId = new mongoose.Types.ObjectId(siteId);
    if (unitId) query.unitId = new mongoose.Types.ObjectId(unitId);
    if (projectId) query.projectId = projectId;
    if (createdBy) query.createdBy = createdBy;
    if (isActive !== undefined) query.isActive = isActive === "true";

    // 🗓️ Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const sortOrder = order === "asc" ? 1 : -1;

    let users, totalUsers, totalPages;

    if (isPagination === "false") {
      // ❌ No pagination — return all
      users = await User.find(query)
        .select("-password")
        .sort({ [sortBy]: sortOrder })
        .populate("siteId")
        .populate("projectId")
        .populate("unitId");
      totalUsers = users.length;
      totalPages = 1;
    } else {
      // 🧮 Pagination applied
      const skip = (parseInt(page) - 1) * parseInt(limit);
      users = await User.find(query)
        .select("-password")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("siteId")
        .populate("projectId")
        .populate("unitId");
      totalUsers = await User.countDocuments(query);
      totalPages = Math.ceil(totalUsers / parseInt(limit));
    }

    // 🔁 Populate referenceId dynamically
    const populatedUsers = await Promise.all(
      users.map(async (user) => {
        if (!user.referenceId) return user;

        let refDoc = null;
        if (user.role === "landlord") {
          refDoc = await Landlord.findById(user.referenceId);
        } else if (user.role === "tenant") {
          refDoc = await Tenant.findById(user.referenceId);
        }
        else if (user.role === "supervisor") {
          refDoc = await Supervisor.findById(user.referenceId);
        }

        return { ...user.toObject(), referenceId: refDoc };
      })
    );

    return sendSuccess(
      res,
      "Users fetched successfully",
      {
        success: true,
        data: populatedUsers,
        totalUsers,
        totalPages,
        currentPage: isPagination === "false" ? 1 : parseInt(page),
        limit: isPagination === "false" ? totalUsers : parseInt(limit),
      },
      200
    );
  } catch (err) {
    return sendError(res, "Error fetching users", 500, err.message);
  }
};

// GET /api/users/:id - get single user
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // if (
    //   req.user.role !== "admin" &&
    //   req.user.role !== "supervisor" &&
    //   req.user._id.toString() !== id
    // ) {
    //   return res
    //     .status(403)
    //     .json({ message: "Not authorized to view this user" });
    // }

    let user = await User.findById(id)
      .select("-password")
      .populate("siteId")
      .populate("projectId")
      .populate("unitId", "_id unitNumber block floor areaSqFt");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Populate referenceId dynamically based on role
    if (user.referenceId) {
      let refDoc = null;
      if (user.role === "landlord") {
        refDoc = await Landlord.findById(user.referenceId);
      } else if (user.role === "tenant") {
        refDoc = await Tenant.findById(user.referenceId);
      }
      else if (user.role === "supervisor") {
        refDoc = await Supervisor.findById(user.referenceId);
      }
      user = user.toObject();
      user.referenceId = refDoc; // attach populated document
    }

    res.json(user);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching user", error: err.message });
  }
};

// controllers/userController.js

export const getUserByToken = async (req, res) => {
  console.log("Request received from middleware", req.user);

  try {
    // ✅ req.user is already populated by protect middleware
    if (!req.user) {
      return sendError(
        res,
        "Not authorised or invalid token",
        401,
        "Not authorised or invalid token"
      );
    }

    // Optional: If you want fresh data from DB (not from req.user)
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return sendError(res, "User not found", 404, "User not found");
    }
    // 🔁 Dynamically fetch referenceId based on role
    let refDoc = null;
    if (user.role === "landlord") {
      refDoc = await Landlord.findById(user.referenceId);
    } else if (user.role === "tenant") {
      refDoc = await Tenant.findById(user.referenceId);
    }

    // merge and send
    const populatedUser = { ...user.toObject(), referenceId: refDoc };

    return sendSuccess(res, "User fetched successfully", populatedUser, 200);
  } catch (error) {
    console.error("Error fetching user:", error);
    return sendError(res, "Something went wrong", 500, error.message);
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params; // user id from URL
    const { role, ...updates } = req.body; // extract role separately

    // ✅ Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ If role is being updated, check if requester is admin
    if (role) {
      if (req.body.requesterRole === "admin") {
        updates.role = role; // only admin can update role
      } else {
        console.warn(`Non-admin tried to update role for user ${id}`);
      }
    }

    // ✅ Update user
    const updatedUser = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    return res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Error updating user:", err);
    return res.status(500).json({
      message: "Error updating user",
      error: err.message,
    });
  }
};

// DELETE /api/users/:id - delete user (admin only)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Only admin can delete users" });

    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting user", error: err.message });
  }
};

/**
 * 🔑 Change Password (for logged-in users)
 */
/**
 * 🔑 Change Password (for logged-in users)
 */
export const changePassword = async (req, res) => {
  try {
    const { id } = req.params; // userId from URL params
    const { currentPassword, newPassword } = req.body;

    // ✅ Validate required fields
    if (!id || !currentPassword || !newPassword) {
      return sendError(
        res,
        "All fields (userId in params, currentPassword, newPassword) are required",
        400
      );
    }

    const user = await User.findById(id);
    if (!user) return sendError(res, "User not found", 404);

    // ✅ Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return sendError(res, "Current password is incorrect", 400);

    // ✅ Assign plain new password — pre('save') hook will hash automatically
    user.password = newPassword;

    await user.save();

    return sendSuccess(res, "Password changed successfully", null, 200);
  } catch (error) {
    console.error("Change Password Error:", error);
    return sendError(res, "Failed to change password", 500, error.message);
  }
};
