import mongoose from "mongoose";
import StockIn from "../models/Stock management/StockIn.modal.js";
import Category from "../models/masters/Category.modal.js";
import SubCategory from "../models/masters/SubCategory.modal.js";
import Site from "../models/masters/site.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";


export const createStockIn = async (req, res) => {
    try {

        const {
            categoryId,
            subCategoryId,
            productName,
            productLocation,
            unit,
            lowStockLimit,
            siteId,
            quantity,
            newStockReceivedDate,
            receivedBy,
            isDefective,
        } = req.body;

        if (!categoryId || !subCategoryId || !productName || !siteId) {
            return sendError(
                res,
                "categoryId, subCategoryId, productName and siteId are required"
            );
        }

        if (
            !mongoose.Types.ObjectId.isValid(categoryId) ||
            !mongoose.Types.ObjectId.isValid(subCategoryId) ||
            !mongoose.Types.ObjectId.isValid(siteId)
        ) {
            return sendError(res, "Invalid categoryId, subCategoryId or siteId");
        }

        const category = await Category.findById(categoryId);
        if (!category) return sendError(res, "Category not found");

        const subCategory = await SubCategory.findById(subCategoryId);
        if (!subCategory) return sendError(res, "SubCategory not found");

        const site = await Site.findById(siteId);
        if (!site) return sendError(res, "Site not found");

        if (quantity !== undefined && quantity < 0) {
            return sendError(res, "Quantity cannot be negative");
        }

        if (lowStockLimit !== undefined && lowStockLimit < 0) {
            return sendError(res, "Low stock limit cannot be negative");
        }

        if (productName.trim().length < 2) {
            return sendError(res, "Product name must be at least 2 characters");
        }

        const stock = await StockIn.create({
            categoryId,
            subCategoryId,
            productName,
            productLocation,
            unit,
            lowStockLimit,
            siteId,
            quantity,
            newStockReceivedDate,
            receivedBy,
            isDefective,
        });

        return sendSuccess(res, stock, "Stock created successfully");
    } catch (error) {
        console.log("❌ ERROR:", error);
        return sendError(res, error.message);
    }
};


export const getStockInList = async (req, res) => {
    try {
        const {
            search,
            siteId,
            categoryId,
            subCategoryId,
            status,
            page = 1,
            limit = 10,
            isPagination = "true",
        } = req.query;

        const filter = { isDeleted: false };

        if (search) {
            filter.productName = { $regex: search, $options: "i" };
        }

        if (siteId) filter.siteId = siteId;
        if (categoryId) filter.categoryId = categoryId;
        if (subCategoryId) filter.subCategoryId = subCategoryId;
        if (status) filter.status = status;

        const totalRecords = await StockIn.countDocuments(filter);
        const totalPages = Math.ceil(totalRecords / limit);

        let list;

        if (isPagination === "false") {
            list = await StockIn.find(filter)
                .populate("categoryId", "name")
                .populate("subCategoryId", "name")
                .populate("siteId", "siteName siteType")
                .sort({ createdAt: -1 });

            return sendSuccess(res, list, "Stock list fetched successfully");
        }

        const skip = (page - 1) * limit;

        list = await StockIn.find(filter)
            .populate("categoryId", "name")
            .populate("subCategoryId", "name")
            .populate("siteId", "siteName siteType")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        return sendSuccess(res, {
            list,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                totalRecords,
                totalPages,
            },
        });
    } catch (error) {
        console.log("❌ ERROR:", error);
        return sendError(res, error.message);
    }
};


export const updateStockIn = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, "Invalid stock id");
        }

        if (req.body.quantity !== undefined && req.body.quantity < 0) {
            return sendError(res, "Quantity cannot be negative");
        }

        if (
            req.body.lowStockLimit !== undefined &&
            req.body.lowStockLimit < 0
        ) {
            return sendError(res, "Low stock limit cannot be negative");
        }

        const updatedStock = await StockIn.findByIdAndUpdate(
            id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!updatedStock) {
            return sendError(res, "Stock not found");
        }

        console.log("✔ STOCK UPDATED:", updatedStock._id);

        return sendSuccess(res, updatedStock, "Stock updated successfully");
    } catch (error) {
        console.log("❌ ERROR:", error);
        return sendError(res, error.message);
    }
};


export const deleteStockIn = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, "Invalid stock id");
        }

        const deleted = await StockIn.findByIdAndUpdate(
            id,
            { isDeleted: true },
            { new: true }
        );

        if (!deleted) {
            return sendError(res, "Stock not found");
        }

        console.log("✔ STOCK SOFT DELETED:", deleted._id);

        return sendSuccess(res, deleted, "Stock deleted successfully");
    } catch (error) {
        console.log("❌ ERROR:", error);
        return sendError(res, error.message);
    }
};
