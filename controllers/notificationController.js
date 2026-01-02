import Notification from "../models/Notification.modal.js";
import mongoose from "mongoose";
import { sendError, sendSuccess } from "../utils/responseHandler.js";
import admin from "../firebase/firebaseAdmin.js";

export const createNotification = async (req, res) => {
    try {
        const { userId, userRole, title, message, payload } = req.body;

        if (!userId || !title || !message) {
            return sendError(res, "userId, title and message are required", 400);
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return sendError(res, "Invalid userId", 400);
        }

        const notification = await Notification.create({
            userId,
            userRole,
            title,
            message,
            payload,
        });

        return sendSuccess(res, "Notification created successfully", notification, 201);
    } catch (error) {
        return sendError(res, "Failed to create notification", 500, error.message);
    }
};

export const createNotifications = async ({
    userId,
    userRole,
    billId,
    complaintId,
    title,
    message,
    isRead = false,
    payload,
    fcmToken,
    screen,
}) => {
    try {
        if (!title || !message) {
            throw new Error("Missing required fields: title, comment, or userId.");
        }

        const notification = new Notification({
            userId,
            userRole,
            billId,
            complaintId,
            title,
            message,
            isRead,
            payload,
            fcmToken,
            screen,

        });
        const savedNotification = await notification.save();
        if (fcmToken) {
            const message1 = {
                notification: {
                    title: title,
                    body: message,
                },
                data: {
                    title: title,
                    body: message,
                    screen: screen,
                },
                token: fcmToken,
                android: {
                    priority: "high",
                },
                apns: {
                    headers: {
                        "apns-priority": "10",
                    },
                },
            };

            await admin.messaging().send(message1);
        }

        return savedNotification;
    } catch (error) {
        console.error("Error creating notification:", error.message);
        return null;
    }
};



export const getAllNotifications = async (req, res) => {
    try {
        const {
            userId,
            userRole,
            isRead,
            fromDate,
            toDate,
            isPagination = "true",
            page = 1,
            limit = 10,
        } = req.query;

        const match = {};

        // ------------------------
        // User filter
        // ------------------------
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            match.userId = userId;
        }

        // ------------------------
        // Role filter
        // ------------------------
        if (userRole) {
            match.userRole = userRole;
        }

        // ------------------------
        // Read / Unread
        // ------------------------
        if (isRead !== undefined) {
            match.isRead = isRead === "true";
        }

        // ------------------------
        // Date filter
        // ------------------------
        if (fromDate || toDate) {
            match.createdAt = {};

            if (fromDate) {
                match.createdAt.$gte = new Date(fromDate);
            }

            if (toDate) {
                const nextDay = new Date(toDate);
                nextDay.setDate(nextDay.getDate() + 1);
                match.createdAt.$lt = nextDay;
            }
        }

        // ------------------------
        // Query
        // ------------------------
        let query = Notification.find(match).sort({ createdAt: -1 });

        const total = await Notification.countDocuments(match);

        // ------------------------
        // Pagination handling
        // ------------------------
        if (isPagination === "true") {
            query = query
                .skip((page - 1) * limit)
                .limit(Number(limit));
        }

        const notifications = await query;

        return sendSuccess(res, "Notifications fetched successfully", {
            notifications,
            total,
            isPagination: isPagination === "true",
            currentPage: isPagination === "true" ? Number(page) : null,
            totalPages:
                isPagination === "true"
                    ? Math.ceil(total / limit)
                    : 1,
        });
    } catch (error) {
        return sendError(res, "Failed to fetch notifications", 500, error.message);
    }
};

export const getNotificationById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, "Invalid notification ID", 400);
        }

        const notification = await Notification.findById(id);

        if (!notification) {
            return sendError(res, "Notification not found", 404);
        }

        return sendSuccess(res, "Notification fetched successfully", notification);
    } catch (error) {
        return sendError(res, "Failed to fetch notification", 500, error.message);
    }
};

export const markNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, "Invalid notification ID", 400);
        }

        const notification = await Notification.findByIdAndUpdate(
            id,
            { isRead: true, readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            return sendError(res, "Notification not found", 404);
        }

        return sendSuccess(res, "Notification marked as read", notification);
    } catch (error) {
        return sendError(res, "Failed to update notification", 500, error.message);
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return sendError(res, "Invalid userId", 400);
        }

        await Notification.updateMany(
            { userId, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        return sendSuccess(res, "All notifications marked as read");
    } catch (error) {
        return sendError(res, "Failed to update notifications", 500, error.message);
    }
};

export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, "Invalid notification ID", 400);
        }

        const notification = await Notification.findByIdAndDelete(id);

        if (!notification) {
            return sendError(res, "Notification not found", 404);
        }

        return sendSuccess(res, "Notification deleted successfully");
    } catch (error) {
        return sendError(res, "Failed to delete notification", 500, error.message);
    }
};
