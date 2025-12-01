import StockItems from "../../models/Stock management/StockItems.modal.js";
import Warehouse from "../../models/masters/Warehouse.modal.js";
import StockTransfer from "../../models/Stock management/StockTransfer.modal.js";

export const transferStock = async (req, res) => {
  try {
    const {
      itemId,
      fromWarehouse,
      toWarehouse,
      quantity,
      transferredBy,
      remarks,
    } = req.body;

    if (!itemId || !fromWarehouse || !toWarehouse || !quantity) {
      return res.status(400).json({
        success: false,
        message: "itemId, fromWarehouse, toWarehouse & quantity are required",
      });
    }

    if (fromWarehouse === toWarehouse) {
      return res.status(400).json({
        success: false,
        message: "Source & Destination warehouse cannot be same",
      });
    }

    // Check source warehouse and destination warehouse
    const sourceWH = await Warehouse.findById(fromWarehouse);
    const destinationWH = await Warehouse.findById(toWarehouse);

    if (!sourceWH || !destinationWH) {
      return res.status(404).json({
        success: false,
        message: "Invalid warehouse details",
      });
    }

    // Check item in source warehouse
    const sourceItem = await StockItems.findOne({
      _id: itemId,
      warehouseId: fromWarehouse,
    });

    if (!sourceItem) {
      return res.status(404).json({
        success: false,
        message: "Item not found in source warehouse",
      });
    }

    // Quantity check
    if (sourceItem.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Not enough stock. Available: ${sourceItem.quantity}`,
      });
    }

    // 1️⃣ Deduct quantity from source warehouse
    sourceItem.quantity -= quantity;
    await sourceItem.save();

    // 2️⃣ Add or Create Item in destination warehouse
    let destinationItem = await StockItems.findOne({
      productName: sourceItem.productName,
      warehouseId: toWarehouse,
    });

    if (destinationItem) {
      destinationItem.quantity += quantity;
      await destinationItem.save();
    } else {
      // Create new entry for warehouse B
      destinationItem = await StockItems.create({
        categoryId: sourceItem.categoryId,
        subCategoryId: sourceItem.subCategoryId,
        productName: sourceItem.productName,
        unit: sourceItem.unit,
        threshold: sourceItem.threshold,
        warehouseId: toWarehouse,
        quantity: quantity,
        productLocation: sourceItem.productLocation,
      });
    }

    // 3️⃣ Log Transfer
    const transferLog = await StockTransfer.create({
      itemId,
      fromWarehouse,
      toWarehouse,
      quantity,
      transferredBy,
      remarks,
    });

    res.status(200).json({
      success: true,
      message: "Stock transferred successfully",
      data: {
        transferLog,
        sourceItem,
        destinationItem,
      },
    });
  } catch (error) {
    console.error("Transfer Error:", error);
    res.status(500).json({
      success: false,
      message: "Stock transfer failed",
      error: error.message,
    });
  }
};

export const getAllTransferLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      fromWarehouse,
      toWarehouse,
      itemId,
      startDate,
      endDate,
      sort = "-createdAt", // latest first
    } = req.query;

    const query = {};

    // 🔍 Search by product name OR remarks
    if (search) {
      query.$or = [{ remarks: { $regex: search, $options: "i" } }];
    }

    // Filter: from warehouse
    if (fromWarehouse) {
      query.fromWarehouse = fromWarehouse;
    }

    // Filter: to warehouse
    if (toWarehouse) {
      query.toWarehouse = toWarehouse;
    }

    // Filter: specific item
    if (itemId) {
      query.itemId = itemId;
    }

    // Filter: date range
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + "T23:59:59"),
      };
    }

    // Pagination values
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Fetch logs with population
    const logs = await StockTransfer.find(query)
      .populate("itemId", "productName unit")
      .populate("fromWarehouse", "name")
      .populate("toWarehouse", "name")
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Total count
    const total = await StockTransfer.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "Transfer logs fetched successfully",
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      data: logs,
    });
  } catch (error) {
    console.error("Get Logs Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch transfer logs",
      error: error.message,
    });
  }
};
