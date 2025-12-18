import mongoose from "mongoose";
import StockOut from "../models/Stock management/Stockout.modal.js";
import StockIn from "../models/Stock management/StockIn.modal.js";
import Category from "../models/masters/Category.modal.js";
import SubCategory from "../models/masters/SubCategory.modal.js";
import Site from "../models/masters/site.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";


export const createStockOut = async (req, res) => {
    try {
        const {
            complainId,
            categoryId,
            subCategoryId,
            siteId,
            supervisor,
            productName,
            productLocation,
            unit,
            quantity,
            remark,
            date,
        } = req.body;

        // 🔴 Required fields
        if (
            !complainId ||
            !categoryId ||
            !subCategoryId ||
            !siteId ||
            !supervisor ||
            !productName ||
            !quantity
        ) {
            return sendError(res, "Required fields are missing");
        }

        if (quantity <= 0) {
            return sendError(res, "Quantity must be greater than zero");
        }

        // 🔴 ObjectId validation
        if (
            !mongoose.Types.ObjectId.isValid(categoryId) ||
            !mongoose.Types.ObjectId.isValid(subCategoryId) ||
            !mongoose.Types.ObjectId.isValid(siteId)
        ) {
            return sendError(res, "Invalid categoryId, subCategoryId or siteId");
        }

        // 🔍 Check masters
        const category = await Category.findById(categoryId);
        if (!category) return sendError(res, "Category not found");

        const subCategory = await SubCategory.findById(subCategoryId);
        if (!subCategory) return sendError(res, "SubCategory not found");

        const site = await Site.findById(siteId);
        if (!site) return sendError(res, "Site not found");

        // 🔍 Find StockIn
        const stockIn = await StockIn.findOne({
            categoryId,
            subCategoryId,
            siteId,
            productName,
            isDeleted: false,
        });

        if (!stockIn) {
            return sendError(res, "Out of stock");
        }

        // ❌ Insufficient quantity
        if (stockIn.quantity < quantity) {
            return sendError(
                res,
                `Insufficient stock. Available quantity: ${stockIn.quantity}`
            );
        }

        // ✅ Create StockOut
        const stockOut = await StockOut.create({
            complainId,
            categoryId,
            subCategoryId,
            siteId,
            supervisor,
            productName,
            productLocation,
            unit,
            quantity,
            remark,
            date,
        });

        // ➖ Deduct quantity from StockIn
        stockIn.quantity -= quantity;
        await stockIn.save(); // status auto handled by pre-save

        return sendSuccess(res, stockOut, "Stock out successfully");
    } catch (error) {
        console.log("❌ ERROR:", error);
        return sendError(res, error.message);
    }
};


export const getStockOutList = async (req, res) => {
    try {
        const {
            search,
            siteId,
            categoryId,
            subCategoryId,
            page = 1,
            limit = 10,
            isPagination = "true",
        } = req.query;

        const filter = {};

        if (search) {
            filter.productName = { $regex: search, $options: "i" };
        }

        if (siteId) filter.siteId = siteId;
        if (categoryId) filter.categoryId = categoryId;
        if (subCategoryId) filter.subCategoryId = subCategoryId;

        const totalRecords = await StockOut.countDocuments(filter);
        const totalPages = Math.ceil(totalRecords / limit);

        // 🔹 Without pagination
        if (isPagination === "false") {
            const list = await StockOut.find(filter)
                .populate("categoryId", "name")
                .populate("subCategoryId", "name")
                .populate("siteId", "name")
                .populate("supervisor", "name")
                .sort({ createdAt: -1 });

            return sendSuccess(res, list, "Stock out list fetched successfully");
        }

        const skip = (page - 1) * limit;

        const list = await StockOut.find(filter)
            .populate("categoryId", "name")
            .populate("subCategoryId", "name")
            .populate("siteId", "name")
            .populate("supervisor", "name")
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


export const updateStockOut = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, "Invalid stock out id");
        }

        // ❌ Quantity update blocked
        if (req.body.quantity !== undefined) {
            return sendError(res, "Quantity update not allowed");
        }

        const updated = await StockOut.findByIdAndUpdate(
            id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!updated) {
            return sendError(res, "Stock out not found");
        }

        return sendSuccess(res, updated, "Stock out updated successfully");
    } catch (error) {
        console.log("❌ ERROR:", error);
        return sendError(res, error.message);
    }
};


export const deleteStockOut = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, "Invalid stock out id");
        }

        const stockOut = await StockOut.findById(id);
        if (!stockOut) {
            return sendError(res, "Stock out not found");
        }

        // 🔁 Restore quantity back to StockIn
        const stockIn = await StockIn.findOne({
            categoryId: stockOut.categoryId,
            subCategoryId: stockOut.subCategoryId,
            siteId: stockOut.siteId,
            productName: stockOut.productName,
            isDeleted: false,
        });

        if (stockIn) {
            stockIn.quantity += stockOut.quantity;
            await stockIn.save();
        }

        await stockOut.deleteOne();

        return sendSuccess(res, null, "Stock out deleted & stock restored");
    } catch (error) {
        console.log("❌ ERROR:", error);
        return sendError(res, error.message);
    }
};
