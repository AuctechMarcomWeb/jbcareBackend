import express from "express";
import { authorizeRoles, protect } from "../../middleware/authMiddleware.js";
import { createUser, deleteUser, getUserById, getUsers, updateUser } from "../../controllers/userController.js";

const router = express.Router();

// create user (admin only) - optional because register exists
router.post("/", protect, authorizeRoles("admin"), createUser);

// read all (admin & supervisor)
router.get("/", protect, authorizeRoles("admin", "supervisor"), getUsers);

// read single (admin/supervisor or owner allowed in controller)
router.get("/:id", protect, getUserById);

// update (admin/supervisor or owner)
router.put("/:id", protect, updateUser);

// delete (admin only)
router.delete("/:id", protect, authorizeRoles("admin"), deleteUser);

export default router;
