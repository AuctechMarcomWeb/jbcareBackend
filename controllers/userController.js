import User from "../models/User.modal.js";
import bcrypt from "bcryptjs";
import Tenant from "../models/Tenant.modal.js";
import Landlord from "../models/LandLord.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

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

    // 🧩 Filters
    if (role) query.role = role;
    if (name) query.name = { $regex: name, $options: "i" };
    if (phone) query.phone = { $regex: phone, $options: "i" };
    if (email) query.email = { $regex: email, $options: "i" };
    if (siteId) query.siteId = siteId;
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

    let user = await User.findById(id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Populate referenceId dynamically based on role
    if (user.referenceId) {
      let refDoc = null;
      if (user.role === "landlord") {
        refDoc = await Landlord.findById(user.referenceId)
          .populate("siteId") // populate site info
          .populate("projectId") // populate project info
          .populate("unitIds");
      } else if (user.role === "tenant") {
        refDoc = await Tenant.findById(user.referenceId)
          .populate("siteId")
          .populate("projectId")
          .populate("unitId");
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

// PUT /api/user/:id - update user (admin/supervisor or owner)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (
      req.user.role !== "admin" &&
      req.user.role !== "supervisor" &&
      req.user._id.toString() !== id
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this user" });
    }
    const updates = { ...req.body };

    // if password provided, hash it
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }

    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User updated", user });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating user", error: err.message });
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
// export const changePassword = async (req, res) => {
//   try {
//     const { userId, currentPassword, newPassword } = req.body;

//     if (!userId || !currentPassword || !newPassword)
//       return sendError(
//         res,
//         "All fields (userId, currentPassword, newPassword) are required",
//         400
//       );

//     const user = await User.findById(userId);
//     if (!user) return sendError(res, "User not found", 404);

//     // ✅ Verify old password
//     const isMatch = await bcrypt.compare(currentPassword, user.password);
//     if (!isMatch) return sendError(res, "Current password is incorrect", 400);

//     // ✅ Hash new password
//     const salt = await bcrypt.genSalt(10);
//     user.password = await bcrypt.hash(newPassword, salt);
//     await user.save();

//     return sendSuccess(res, "Password changed successfully", null, 200);
//   } catch (error) {
//     console.error("Change Password Error:", error);
//     return sendError(res, "Failed to change password", 500, error.message);
//   }
// };
