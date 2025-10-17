import User from "../models/User.modal.js";
import bcrypt from "bcryptjs";
import Tenant from "../models/Tenant.modal.js";
import Landlord from "../models/LandLord.modal.js";


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

// GET /api/users - list all users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    // Populate referenceId dynamically
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

    res.json(populatedUsers);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching users", error: err.message });
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
        refDoc = await Landlord.findById(user.referenceId);
      } else if (user.role === "tenant") {
        refDoc = await Tenant.findById(user.referenceId);
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

// PUT /api/users/:id - update user (admin/supervisor or owner)
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
