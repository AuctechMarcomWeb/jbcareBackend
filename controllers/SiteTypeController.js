import SiteType from "../models/masters/siteType.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

export const createSiteType = async (req, res) => {
    try {
        const { title, status } = req.body;

        if (!title || typeof title !== "string" || title.trim() === "") {
            return sendError(
                res,
                "Title is required and must be a non-empty string",
                400
            );
        }

        const existing = await SiteType.findOne({
            title: { $regex: `^${title.trim()}$`, $options: "i" },
        });
        if (existing)
            return sendError(res, "SiteType with this title already exists", 400);

        const unitType = await SiteType.create({ title: title.trim(), status });

        return sendSuccess(res, "SiteType created successfully", unitType, 201);
    } catch (err) {
        console.error("Create SiteType Error:", err);
        return sendError(res, "Failed to create SiteType", 500, err.message);
    }
};

export const getAllSiteTypes = async (req, res) => {
    try {
        const {
            search,
            status,
            isPagination = "true",
            page = 1,
            limit = 10,
        } = req.query;

        const match = {};

        if (search && search.trim() !== "") {
            const regex = new RegExp(search.trim(), "i");
            match.title = { $regex: regex };
        }

        if (status !== undefined) {
            match.status = status === "true";
        }

        let query = SiteType.find(match).sort({ createdAt: -1 });

        const total = await SiteType.countDocuments(match);

        if (isPagination === "true") {
            query = query.skip((page - 1) * parseInt(limit)).limit(parseInt(limit));
        }

        const unitTypes = await query;

        return sendSuccess(
            res,
            "SiteTypes fetched successfully",
            {
                unitTypes,
                totalSiteTypes: total,
                totalPages: Math.ceil(total / limit),
                currentPage: Number(page),
            },
            200
        );
    } catch (err) {
        return sendError(res, "Failed to fetch SiteTypes", 500, err.message);
    }
};

// ✅ Update SiteType
export const updateSiteType = async (req, res) => {
    try {
        const { title, status } = req.body;

        // 🔹 Optional: validate title if provided
        if (title && (typeof title !== "string" || title.trim() === "")) {
            return sendError(res, "Title must be a non-empty string", 400);
        }

        // 🔍 Check for duplicate title if updating
        if (title) {
            const existing = await SiteType.findOne({
                _id: { $ne: req.params.id },
                title: { $regex: `^${title.trim()}$`, $options: "i" },
            });
            if (existing)
                return sendError(
                    res,
                    "Another SiteType with this title already exists",
                    400
                );
        }

        const unitType = await SiteType.findByIdAndUpdate(
            req.params.id,
            { title: title?.trim(), status },
            { new: true }
        );

        if (!unitType) return sendError(res, "SiteType not found", 404);

        return sendSuccess(res, "SiteType updated successfully", unitType, 200);
    } catch (err) {
        return sendError(res, "Failed to update SiteType", 500, err.message);
    }
};

// ✅ Delete SiteType
export const deleteSiteType = async (req, res) => {
    try {
        const unitType = await SiteType.findByIdAndDelete(req.params.id);
        if (!unitType) return sendError(res, "SiteType not found", 404);

        return sendSuccess(res, "SiteType deleted successfully", null, 200);
    } catch (err) {
        return sendError(res, "Failed to delete SiteType", 500, err.message);
    }
};
