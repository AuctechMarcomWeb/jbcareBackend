
import StockTransfer from "../../models/Stock management/StockTransfer.modal.js";
import StockIn from "../../models/Stock management/StockIn.modal.js";
import { sendError, sendSuccess } from "../../utils/responseHandler.js";

export const transferStock = async (req, res) => {
  try {
    const {
      productName,
      fromSiteId,
      brandName,
      toSiteId,
      quantity,
      remark,
      transferredBy,
    } = req.body;

    /* 1️⃣ SOURCE SITE PRODUCT FIND */
    const sourceStock = await StockIn.findOne({
      productName,
      siteId: fromSiteId,
      isDeleted: false,
    });



    if (!sourceStock) {
      return sendError(res, "Product not found in source site");
    }

    if (sourceStock.quantity < quantity) {
      return sendError(res, "Insufficient stock");
    }

    /* 2️⃣ SOURCE SITE STOCK OUT */
    sourceStock.quantity -= quantity;

    sourceStock.stockout.push({
      categoryId: sourceStock.categoryId,
      brandName: brandName,
      siteId: fromSiteId,
      productName: sourceStock._id,
      productLocation: sourceStock.productLocation,
      unit: sourceStock.unit,
      quantity,
      remark: remark || "Stock transferred to another site",
      date: new Date(),
    });

    await sourceStock.save();

    /* 3️⃣ DESTINATION SITE PRODUCT FIND */
    let destinationStock = await StockIn.findOne({
      productName,
      siteId: toSiteId,
      isDeleted: false,
    });

    if (destinationStock) {
      /* EXISTING PRODUCT → STOCK IN */

      destinationStock.quantity += quantity;

      destinationStock.stockin.push({
        quantity,
        receivedBy: transferredBy,
        brandName: brandName,
        receivedDate: new Date(),
        remark: `Stock received from site ${fromSiteId}`,
      });

      await destinationStock.save();
    } else {
      /* NEW PRODUCT CREATE */

      destinationStock = await StockIn.create({
        categoryId: sourceStock.categoryId,
        productName: brandName,
        brandName: sourceStock.brandName,
        productLocation: sourceStock.productLocation,
        siteId: toSiteId,
        unit: sourceStock.unit,
        quantity,

        stockin: [
          {
            quantity,
            receivedBy: transferredBy,
            brandName: brandName,
            receivedDate: new Date(),
            remark: `Stock received from site ${fromSiteId}`,
          },
        ],
      });
    }

    /* 4️⃣ TRANSFER HISTORY SAVE */

    await StockTransfer.create({
      productId: sourceStock._id,
      productName: sourceStock.productName,
      brandName: brandName,
      categoryId: sourceStock.categoryId,
      fromSiteId,
      toSiteId,
      quantity,
      remark,
      transferredBy,
    });

    return sendSuccess(res, null, "Stock transferred successfully");
  } catch (error) {
    console.log("❌ ERROR:", error);
    return sendError(res, error.message);
  }
};

export const getStockTransferList = async (req, res) => {
  try {
    const {
      search,
      productName,
      brandName,
      fromSiteId,
      toSiteId,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
      isPagination = "true",
    } = req.query;

    const filter = {};

    if (productName) {
      filter.productName = { $regex: productName, $options: "i" };
    }
    if (brandName) {
      filter.brandName = { $regex: brandName, $options: "i" };
    }

    if (fromSiteId) {
      filter.fromSiteId = fromSiteId;
    }

    if (toSiteId) {
      filter.toSiteId = toSiteId;
    }

    // ⭐ DATE FILTER
    if (fromDate || toDate) {
      const start = fromDate ? new Date(fromDate) : new Date("1970-01-01");
      const end = toDate ? new Date(toDate) : new Date();

      end.setHours(23, 59, 59, 999);

      filter.transferDate = {
        $gte: start,
        $lte: end,
      };
    }

    // ⭐ SEARCH FILTER
    if (search) {
      filter.$or = [
        { productName: { $regex: search, $options: "i" } },
        { brandName: { $regex: search, $options: "i" } },
        { remark: { $regex: search, $options: "i" } },
      ];
    }

    const totalRecords = await StockTransfer.countDocuments(filter);
    const totalPages = Math.ceil(totalRecords / limit);

    if (isPagination === "false") {
      const list = await StockTransfer.find(filter)
        .populate("fromSiteId", "siteName")
        .populate("toSiteId", "siteName")
        .sort({ createdAt: -1 });

      return sendSuccess(res, list, "Stock transfer list fetched successfully");
    }

    const skip = (page - 1) * limit;

    const list = await StockTransfer.find(filter)
      .populate("fromSiteId", "siteName")
      .populate("toSiteId", "siteName")
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
