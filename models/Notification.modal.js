import mongoose from "mongoose";

const { Schema } = mongoose;

const NotificationSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        userRole: {
            type: String,
            enum: ["admin", "user", "supervisor", "landlord", "tenant"],
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        readAt: {
            type: Date,
        },
        payload: {
            type: Object,
        },
    },
    { timestamps: true }
);

const Notification =
    mongoose.models.Notification ||
    mongoose.model("Notification", NotificationSchema);

export default Notification;
