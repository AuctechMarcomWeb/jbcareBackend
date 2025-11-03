import express from "express";
// import { authorizeRoles, protect } from "../../middleware/authMiddleware.js";
import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
  getUserByToken,
  changePassword,
} from "../../controllers/userController.js";
import { protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

// create user (admin only) - optional because register exists
router.post("/", createUser);

// read all (admin & supervisor)
router.get("/", getUsers);

router.get("/byToken", protect(true), getUserByToken);
// read single (admin/supervisor or owner allowed in controller)
router.get("/:id", getUserById);

// update (admin/supervisor or owner)
router.put("/:id", updateUser);

router.patch("/change-password/:id", changePassword);



// delete (admin only)
router.delete("/:id", deleteUser);

export default router;
