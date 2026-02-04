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
      brandName,
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

    if (!categoryId || !brandName || !productName || !siteId) {
      return sendError(
        res,
        "categoryId, brandName, productName and siteId are required",
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(categoryId) ||
      !mongoose.Types.ObjectId.isValid(siteId)
    ) {
      return sendError(res, "Invalid categoryId, subCategoryId or siteId");
    }

    const category = await Category.findById(categoryId);
    if (!category) return sendError(res, "Category not found");

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

    let stock = await StockIn.findOne({
      categoryId,
      productName,
      siteId,
      isDeleted: false,
    });

    if (stock) {
      // ✅ Update quantity only
      stock.quantity += quantity;

      // ✅ Push stock-in history (with brandName)
      stock.stockin.push({
        quantity,
        receivedBy,
        isDefective,
        brandName,
      });

      // 🔄 Status update
      if (stock.quantity === 0) stock.status = "OUT OF STOCK";
      else if (stock.quantity <= stock.lowStockLimit)
        stock.status = "LOW STOCK";
      else stock.status = "IN STOCK";

      await stock.save();
    } else {
      // 🆕 Create new product (brandName stored once)
      stock = await StockIn.create({
        categoryId,
        brandName, // first-time brand
        productName,
        productLocation,
        unit,
        lowStockLimit,
        siteId,
        quantity,
        stockin: [
          {
            quantity,
            receivedBy,
            isDefective,
            brandName,
          },
        ],
      });
    }

    return sendSuccess(res, stock, "Stock created successfully");
  } catch (error) {
    console.log("❌ ERROR:", error);
    return sendError(res, error.message);
  }
};

export const getStockInCountStats = async (req, res) => {
  try {
    const { siteId, categoryId, brandName } = req.query;

    const matchFilter = { isDeleted: false };

    if (siteId) matchFilter.siteId = siteId;
    if (categoryId) matchFilter.categoryId = categoryId;
    if (brandName) matchFilter.brandName = brandName;

    const stats = await StockIn.aggregate([
      { $match: matchFilter },

      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Default response
    const result = {
      total: 0,
      "IN STOCK": 0,
      "LOW STOCK": 0,
      "OUT OF STOCK": 0,
    };

    stats.forEach((item) => {
      result[item._id] = item.count;
      result.total += item.count;
    });

    return sendSuccess(res, result, "Stock status count fetched successfully");
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
      // subCategoryId,
      brandName,
      status,
      page = 1,
      limit = 10,
      isPagination = "true",
    } = req.query;
    const { fromDate, toDate } = req.query;

    const filter = { isDeleted: false };

    if (search) {
      filter.productName = { $regex: search, $options: "i" };
    }

    if (siteId) filter.siteId = siteId;
    if (categoryId) filter.categoryId = categoryId;
    if (brandName) filter.brandName = brandName;
    if (status) filter.status = status;

    if (fromDate || toDate) {
      const start = fromDate ? new Date(fromDate) : new Date("1970-01-01");
      const end = toDate ? new Date(toDate) : new Date();

      // include full day for toDate
      end.setHours(23, 59, 59, 999);

      filter.$or = [
        {
          newStockReceivedDate: {
            $gte: start,
            $lte: end,
          },
        },
        {
          lastUpdatedDate: {
            $gte: start,
            $lte: end,
          },
        },
      ];
    }

    const totalRecords = await StockIn.countDocuments(filter);
    const totalPages = Math.ceil(totalRecords / limit);

    let list;

    if (isPagination === "false") {
      list = await StockIn.find(filter)
        .populate("categoryId", "name")
        .populate("siteId", "siteName siteType")
        .populate({
          path: "stockout.complainId",
          select: "complaintNo title status", // adjust fields
        })
        .populate({
          path: "stockout.supervisor",
          select: "name phone email", // adjust fields
        })
        .sort({ createdAt: -1 });

      return sendSuccess(res, list, "Stock list fetched successfully");
    }

    const skip = (page - 1) * limit;

    list = await StockIn.find(filter)
      .populate("categoryId", "name")
      .populate("siteId", "siteName siteType")
      .populate({
        path: "stockout.complainId",
        select:
          "complaintDescription otherproblemType problemType complaintTitle status", // adjust fields
      })
      .populate({
        path: "stockout.supervisor",
        select: "name phone email", // adjust fields
      })
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



export const getDateWiseStockIn1 = async (req, res) => {
  try {
    const {
      search,
      siteId,
      status,
      categoryId,
      brandName,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
      isPagination = "true",
    } = req.query;

    const filter = { isDeleted: false };

    if (search) filter.productName = { $regex: search, $options: "i" };
    if (siteId) filter.siteId = siteId;
    if (categoryId) filter.categoryId = categoryId;
    if (brandName) filter.brandName = brandName;
    if (status) filter.status = status;

    let dateFilter = {};

    if (fromDate || toDate) {
      const start = fromDate ? new Date(fromDate) : new Date("1970-01-01");
      const end = toDate ? new Date(toDate) : new Date();
      end.setHours(23, 59, 59, 999);

      dateFilter = {
        "stockin.receivedDate": {
          $gte: start,
          $lte: end,
        },
      };
    }

    // -----------------------------
    // 🚀 Aggregation Pipeline
    // -----------------------------
    const pipeline = [
      {
        $match: {
          ...filter,
          ...dateFilter,
        },
      },

      // Break stockin array into separate records
      {
        $unwind: "$stockin",
      },

      // Join Category
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },

      // Join Site
      {
        $lookup: {
          from: "sites",
          localField: "siteId",
          foreignField: "_id",
          as: "site",
        },
      },
      { $unwind: "$site" },

      // Selected fields + merged stockin details
      {
        $project: {
          _id: 0,
          productId: "$_id",

          category: 1, // FULL CATEGORY
          site: 1,     // FULL SITE

          brandName: 1,
          productName: 1,
          productLocation: 1,
          unit: 1,
          lowStockLimit: 1,
          quantity: 1,
          newStockReceivedDate: 1,
          lastUpdatedDate: 1,
          stockOutQuantity: 1,
          lastStockOut: 1,
          receivedBy: 1,
          isDefective: 1,
          status: 1,

          // MERGED STOCKIN OBJECT
          stockin: {
            quantity: "$stockin.quantity",
            receivedBy: "$stockin.receivedBy",
            brandName: "$stockin.brandName",
            receivedDate: "$stockin.receivedDate",
            isDefective: "$stockin.isDefective",
            remark: "$stockin.remark",
          },
        },
      },

      // Sort latest first
      { $sort: { "stockin.receivedDate": -1 } },
    ];

    // -----------------------------
    // 📌 Pagination Logic
    // -----------------------------
    const totalRecords = (await StockIn.aggregate(pipeline)).length;
    const totalPages = Math.ceil(totalRecords / limit);

    if (isPagination === "true") {
      const skip = (page - 1) * limit;
      pipeline.push({ $skip: skip }, { $limit: Number(limit) });
    }

    const result = await StockIn.aggregate(pipeline);

    return sendSuccess(res, {
      list: result,
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

export const getDateWiseStockIn = async (req, res) => {
  try {
    const {
      search,
      siteId,
      status,
      categoryId,
      brandName,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
      isPagination = "true",
    } = req.query;

    const filter = { isDeleted: false };

    // STRING → ObjectId Convert
    if (categoryId) filter.categoryId = new mongoose.Types.ObjectId(categoryId);
    if (siteId) filter.siteId = new mongoose.Types.ObjectId(siteId);

    if (search) filter.productName = { $regex: search, $options: "i" };
    if (brandName) filter.brandName = brandName;
    if (status) filter.status = status;

    // DATE FILTER
    let dateFilter = {};
    if (fromDate || toDate) {
      const start = fromDate ? new Date(fromDate) : new Date("1970-01-01");
      const end = toDate ? new Date(toDate) : new Date();
      end.setHours(23, 59, 59, 999);

      dateFilter = {
        "stockin.receivedDate": {
          $gte: start,
          $lte: end,
        },
      };
    }

    // PIPELINE
    const pipeline = [
      {
        $match: {
          ...filter,
          ...dateFilter,
        },
      },

      { $unwind: "$stockin" },

      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },

      {
        $lookup: {
          from: "sites",
          localField: "siteId",
          foreignField: "_id",
          as: "site",
        },
      },
      { $unwind: "$site" },

      {
        $project: {
          _id: 0,
          productId: "$_id",
          category: 1,
          site: 1,

          brandName: 1,
          productName: 1,
          productLocation: 1,
          unit: 1,
          lowStockLimit: 1,
          quantity: 1,
          status: 1,

          stockin: {
            quantity: "$stockin.quantity",
            receivedBy: "$stockin.receivedBy",
            brandName: "$stockin.brandName",
            receivedDate: "$stockin.receivedDate",
            isDefective: "$stockin.isDefective",
            remark: "$stockin.remark",
          },
        },
      },

      { $sort: { "stockin.receivedDate": -1 } },
    ];

    // PAGINATION
    const totalRecords = (await StockIn.aggregate(pipeline)).length;
    const totalPages = Math.ceil(totalRecords / limit);

    if (isPagination === "true") {
      const skip = (page - 1) * limit;
      pipeline.push({ $skip: skip }, { $limit: Number(limit) });
    }

    const result = await StockIn.aggregate(pipeline);

    return sendSuccess(res, {
      list: result,
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

export const getStockInById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return sendError(res, "Product ID is required");

    const product = await StockIn.findById(id)
      .populate("categoryId")   // category full object
      .populate("siteId")       // site full object
      .lean();

    if (!product) {
      return sendError(res, "Product not found");
    }

    return sendSuccess(res, product);

  } catch (error) {
    console.log("❌ ERROR:", error);
    return sendError(res, error.message);
  }
};


export const getStockSummary = async (req, res) => {
  try {
    const { siteId, productName, categoryId, subCategoryId } = req.query;

    const matchStage = { isDeleted: false };

    if (siteId) matchStage.siteId = new mongoose.Types.ObjectId(siteId);
    if (productName?.trim())
      matchStage.productName = { $regex: productName, $options: "i" };
    if (categoryId)
      matchStage.categoryId = new mongoose.Types.ObjectId(categoryId);
    if (subCategoryId)
      matchStage.subCategoryId = new mongoose.Types.ObjectId(subCategoryId);

    const result = await StockIn.aggregate([
      { $match: matchStage },

      /* ---------- GROUP WITHOUT UNWIND ---------- */
      {
        $group: {
          _id: {
            siteId: "$siteId",
            productName: "$productName",
          },

          totalStockIn: { $sum: "$quantity" },

          totalStockOut: {
            $sum: {
              $reduce: {
                input: { $ifNull: ["$stockout", []] },
                initialValue: 0,
                in: { $add: ["$$value", "$$this.quantity"] },
              },
            },
          },

          lowStockLimit: { $first: "$lowStockLimit" },
        },
      },

      /* ---------- SITE LOOKUP ---------- */
      {
        $lookup: {
          from: "sites",
          localField: "_id.siteId",
          foreignField: "_id",
          as: "site",
        },
      },
      { $unwind: "$site" },

      {
        $project: {
          _id: 0,
          site: {
            _id: "$site._id",
            name: "$site.siteName",
            location: "$site.siteType",
          },
          productName: "$_id.productName",
          totalStockIn: 1,
          totalStockOut: 1,
          currentStock: 1,
          lowStockLimit: 1,
        },
      },

      { $sort: { productName: 1 } },
    ]);

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error("Stock Summary Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const updateStockIn = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, "Invalid stock id");
    }

    const stock = await StockIn.findById(id);
    if (!stock) {
      return sendError(res, "Stock not found");
    }

    const incomingQty = req.body.quantity;

    // ❌ Prevent negative quantity
    if (incomingQty !== undefined && incomingQty < 0) {
      return sendError(res, "Quantity cannot be negative");
    }

    if (req.body.lowStockLimit !== undefined && req.body.lowStockLimit < 0) {
      return sendError(res, "Low stock limit cannot be negative");
    }

    // 🔥 STOCK IN CASE (quantity increased)
    if (incomingQty !== undefined && incomingQty > stock.quantity) {
      // Shift dates
      stock.lastUpdatedDate = stock.newStockReceivedDate || null;
      stock.newStockReceivedDate = new Date();
    }

    // 🔁 Update other allowed fields
    Object.assign(stock, req.body);

    // 🔁 Status update
    if (stock.quantity === 0) {
      stock.status = "OUT OF STOCK";
    } else if (stock.quantity < stock.lowStockLimit) {
      stock.status = "LOW STOCK";
    } else {
      stock.status = "IN STOCK";
    }

    await stock.save();

    return sendSuccess(res, stock, "Stock updated successfully");
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
      { new: true },
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

export const createStockOut = async (req, res) => {
  try {
    const {
      complainId,
      categoryId,
      siteId,
      supervisor,
      productName,
      productLocation,
      unit,
      quantity,
      remark,
      date,
    } = req.body;

    if (
      !complainId ||
      !categoryId ||
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

    if (
      !mongoose.Types.ObjectId.isValid(productName) ||
      !mongoose.Types.ObjectId.isValid(categoryId) ||
      !mongoose.Types.ObjectId.isValid(siteId)
    ) {
      return sendError(res, "Invalid IDs provided");
    }

    // 🔍 Find StockIn
    const stockIn = await StockIn.findOne({
      _id: productName,
      categoryId,
      siteId,
      isDeleted: false,
    });

    if (!stockIn) {
      return sendError(res, "Stock item not found");
    }

    if (stockIn.quantity < quantity) {
      return sendError(
        res,
        `Insufficient stock. Available: ${stockIn.quantity}`,
      );
    }

    // ✅ Create StockOut entry
    // const stockOut = await StockOut.create({
    //     complainId,
    //     categoryId,
    //     siteId,
    //     supervisor,
    //     productName,
    //     unitId,
    //     productLocation,
    //     unit,
    //     quantity,
    //     remark,
    //     date,
    // });

    // 🔽 Update StockIn quantities
    stockIn.quantity -= quantity;
    stockIn.stockOutQuantity += quantity;

    // 🔁 Update status
    if (stockIn.quantity === 0) {
      stockIn.status = "OUT OF STOCK";
    } else if (stockIn.quantity <= stockIn.lowStockLimit) {
      stockIn.status = "LOW STOCK";
    } else {
      stockIn.status = "IN STOCK";
    }

    // 🕒 Update ONLY lastUpdatedDate
    stockIn.lastUpdatedDate = new Date();

    await stockIn.save();

    return sendSuccess(res, stockOut, "Stock out successfully");
  } catch (error) {
    console.log("❌ ERROR:", error);
    return sendError(res, error.message);
  }
};

export const performStockOut = async (req, res) => {
  try {
    const {
      stockInId,
      complainId,
      categoryId,
      siteId,
      supervisor,
      productLocation,
      unit,
      quantity,
      remark,
      date,
    } = req.body;

    if (
      !stockInId ||
      !complainId ||
      !categoryId ||
      !siteId ||
      !supervisor ||
      !quantity
    ) {
      return sendError(res, "Required fields are missing");
    }

    if (!mongoose.Types.ObjectId.isValid(stockInId)) {
      return sendError(res, "Invalid stockInId");
    }

    if (quantity <= 0) {
      return sendError(res, "Stock out quantity must be greater than 0");
    }

    const stock = await StockIn.findById(stockInId);

    if (!stock || stock.isDeleted) {
      return sendError(res, "Stock not found");
    }

    if (stock.quantity < quantity) {
      return sendError(res, `Insufficient stock. Available: ${stock.quantity}`);
    }

    // ✅ SAFETY: normalize first
    if (typeof stock.stockOutQuantity !== "number") {
      stock.stockOutQuantity = 0;
    }

    // 🔽 Deduct stock
    stock.quantity -= quantity;

    // ✅ INCREMENT (not overwrite)
    // stock.stockOutQuantity += quantity;

    // 🧾 Push history
    stock.stockout.push({
      complainId,
      categoryId,
      brandName: stock.brandName,
      siteId,
      supervisor,
      productName: stock._id,
      productLocation: productLocation || stock.productLocation,
      unit: unit || stock.unit,
      quantity,
      remark,
      date: date || new Date(),
    });
    // 🧮 ALWAYS recompute from history (SAFE)
    stock.stockOutQuantity = stock.stockout.reduce(
      (sum, entry) => sum + entry.quantity,
      0,
    );
    // 🔁 Status update
    if (stock.quantity === 0) {
      stock.status = "OUT OF STOCK";
    } else if (stock.quantity <= stock.lowStockLimit) {
      stock.status = "LOW STOCK";
    } else {
      stock.status = "IN STOCK";
    }

    // 🕒 Dates
    stock.lastStockOut = new Date();

    await stock.save();

    return sendSuccess(
      res,
      {
        quantity: stock.quantity,
        stockOutQuantity: stock.stockOutQuantity,
        lastStockOut: stock.lastStockOut,
        status: stock.status,
        lastStockOutEntry: stock.stockout.at(-1),
      },
      "Stock out completed successfully",
    );
  } catch (error) {
    console.error("❌ ERROR:", error);
    return sendError(res, error.message);
  }
};
