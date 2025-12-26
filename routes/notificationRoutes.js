import express from "express";
import {
    createNotification,
    getAllNotifications,
    getNotificationById,
    markNotificationAsRead,
    markAllAsRead,
    deleteNotification,
} from "../controllers/notificationController.js";

const router = express.Router();

router.post("/", createNotification);
router.get("/", getAllNotifications);
router.get("/:id", getNotificationById);
router.patch("/:id/read", markNotificationAsRead);
router.patch("/read-all", markAllAsRead);
router.delete("/:id", deleteNotification);

export default router;
