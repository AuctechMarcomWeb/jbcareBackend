import Category from "../../models/masters/Category.modal.js";
import SubCategory from "../../models/masters/SubCategory.modal.js";
import Warehouse from "../../models/masters/Warehouse.modal.js";
import StockItems from "../../models/Stock management/StockItems.modal.js";
import { sendSuccess } from "../../utils/responseHandler.js";

const getStockStatus = (quantity, threshold) => {
  if (quantity === undefined || threshold === undefined) return "Unknown";

  if (quantity <= 0) return "OUT OF STOCK";
  if (quantity <= threshold) return "LOW STOCK";
  return "IN STOCK";
};

export const createStockItem = async (req, res) => {
  try {
    const {
      categoryId,
      subCategoryId,
      productName,
      productLocation,
      unit,
      threshold,
      warehouseId,
      quantity,
    } = req.body;

    // Required field validation
    if (!categoryId || !subCategoryId || !productName || !warehouseId) {
      return res.status(400).json({
        success: false,
        message:
          "categoryId, subCategoryId, productName, warehouseId are required",
      });
    }

    // 🔍 Validate Category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Invalid categoryId — category not found",
      });
    }

    // 🔍 Validate Sub-category exists
    const subCategory = await SubCategory.findById(subCategoryId);
    if (!subCategory) {
      return res.status(400).json({
        success: false,
        message: "Invalid subCategoryId — sub-category not found",
      });
    }

    // 🔍 Validate Warehouse exists
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return res.status(400).json({
        success: false,
        message: "Invalid warehouseId — warehouse not found",
      });
    }

    // Calculate Status
    const status = getStockStatus(Number(quantity), Number(threshold));

    // Create Stock Item
    const newItem = await StockItems.create({
      categoryId,
      subCategoryId,
      productName,
      productLocation,
      unit,
      threshold,
      warehouseId,
      quantity,
      status,
    });

    return sendSuccess(
      res,
      "Stock created successfully",
      {
        success: true,
        newItem,
      },
      200
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getStockItems = async (req, res) => {
  try {
    const {
      search,
      warehouseId,
      status,
      categoryId,
      subCategoryId,
      page = 1,
      limit = 10,
      isPagination = "true",
    } = req.query;

    const filter = { isDeleted: false };

    if (warehouseId) filter.warehouseId = warehouseId;
    if (status) filter.status = status;
    if (categoryId) filter.categoryId = categoryId;
    if (subCategoryId) filter.subCategoryId = subCategoryId;

    if (search) {
      filter.productName = { $regex: search, $options: "i" };
    }

    // 📌 Total matching records
    const totalRecords = await StockItems.countDocuments(filter);
    const totalPages = Math.ceil(totalRecords / limit);

    let list;

    // ⚡ No Pagination: return full list
    if (isPagination === "false") {
      list = await StockItems.find(filter)
        .sort({ productName: 1 })
        .populate("categoryId", "name")
        .populate("subCategoryId", "name")
        .populate("warehouseId", "name address");

      return res.json({
        success: true,
        message: "stock items fetched successfully",
        data: list,
        pagination: {
          page: null,
          limit: null,
          totalRecords: list.length,
          totalPages: 1,
        },
      });
    }

    // ⚡ Pagination: skip & limit
    const skip = (page - 1) * limit;

    list = await StockItems.find(filter)
      .sort({ productName: 1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("categoryId", "name")
      .populate("subCategoryId", "name")
      .populate("warehouseId", "name address");

    return res.json({
      success: true,
      message: "stock items fetched successfully",
      data: list,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalRecords,
        totalPages,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getStockItemById = async (req, res) => {
  try {
    const item = await StockItems.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!item)
      return res.status(404).json({
        success: false,
        message: "Stock item not found",
      });
    return sendSuccess(res, "Stock item fetched",{ success: true, data: item }, 200)
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

export const updateStockItem = async (req, res) => {
  try {
    const { qty, type, quantity, threshold } = req.body;

    // Find only if NOT deleted
    const item = await StockItems.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item does not exist or has been deleted",
      });
    }

    let newQty = item.quantity;

    // 🔥 Handle stock increase / decrease
    if (qty !== undefined && type) {
      if (type === "increase") newQty = item.quantity + qty;
      else if (type === "decrease") {
        if (item.quantity < qty) {
          return res.status(400).json({
            success: false,
            message: "Not enough stock",
          });
        }
        newQty = item.quantity - qty;
      }
    }

    // 🔥 Handle manual quantity update
    if (quantity !== undefined) newQty = quantity;

    // 🔥 Handle threshold update
    const newThreshold = threshold !== undefined ? threshold : item.threshold;

    // 🔥 Auto status update
    const status = getStockStatus(newQty, newThreshold);

    const updatePayload = {
      ...req.body,
      quantity: newQty,
      threshold: newThreshold,
      status,
    };

    const updated = await StockItems.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true }
    );

    // res.json({ success: true, data: updated });
    return sendSuccess(res, "Stock Item Updated Successfully", updated, 200);
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false });
  }
};

export const deleteStockItem = async (req, res) => {
  try {
    const deleted = await StockItems.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!deleted)
      return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, message: "Item soft deleted", data: deleted });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false });
  }
};

// export const increaseStock = async (req, res) => {
//   try {
//     const { qty } = req.body;

//     const item = await StockItems.findById(req.params.id);
//     if (!item)
//       return res.status(404).json({ success: false, message: "Not found" });

//     const newQty = item.quantity + qty;
//     const status = getStockStatus(newQty, item.threshold);

//     item.quantity = newQty;
//     item.status = status;
//     await item.save();

//     res.json({ success: true, data: item });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ success: false });
//   }
// };

// export const decreaseStock = async (req, res) => {
//   try {
//     const { qty } = req.body;

//     const item = await StockItems.findById(req.params.id);
//     if (!item)
//       return res.status(404).json({ success: false, message: "Not found" });

//     if (item.quantity < qty)
//       return res.status(400).json({
//         success: false,
//         message: "Not enough stock",
//       });

//     const newQty = item.quantity - qty;
//     const status = getStockStatus(newQty, item.threshold);

//     item.quantity = newQty;
//     item.status = status;

//     await item.save();

//     res.json({ success: true, data: item });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ success: false });
//   }
// };
