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
        billId: {
            type: Schema.Types.ObjectId,
            ref: "Bills",
        },
        complaintId: {
            type: Schema.Types.ObjectId,
            ref: "Complaint",
        },
        userRole: {
            type: String,
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
