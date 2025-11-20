exports.createStockItem = async (req, res) => {
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

    if (!categoryId || !subCategoryId || !productName || !warehouseId) {
      return res.status(400).json({
        success: false,
        message:
          "categoryId, subCategoryId, productName, warehouseId are required",
      });
    }

    const status = getStockStatus(quantity, threshold);

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

    res.json({ success: true, data: newItem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getStockItems = async (req, res) => {
  try {
    const { search, warehouseId, status } = req.query;

    const filter = { isDeleted: false };

    if (warehouseId) filter.warehouseId = warehouseId;
    if (status) filter.status = status;

    if (search) {
      filter.productName = { $regex: search, $options: "i" };
    }

    const items = await StockItems.find(filter)
      .populate("categoryId", "categoryName")
      .populate("subCategoryId", "subCategoryName")
      .populate("warehouseId", "name");

    res.json({ success: true, data: items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getStockItemById = async (req, res) => {
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

    res.json({ success: true, data: item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

exports.updateStockItem = async (req, res) => {
  try {
    const { quantity, threshold } = req.body;

    const existing = await StockItems.findById(req.params.id);
    if (!existing)
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });

    const newQty = quantity !== undefined ? quantity : existing.quantity;
    const newThreshold =
      threshold !== undefined ? threshold : existing.threshold;

    const status = getStockStatus(newQty, newThreshold);

    const updated = await StockItems.findByIdAndUpdate(
      req.params.id,
      { ...req.body, status },
      { new: true }
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false });
  }
};

exports.deleteStockItem = async (req, res) => {
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

exports.increaseStock = async (req, res) => {
  try {
    const { qty } = req.body;

    const item = await StockItems.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Not found" });

    const newQty = item.quantity + qty;
    const status = getStockStatus(newQty, item.threshold);

    item.quantity = newQty;
    item.status = status;
    await item.save();

    res.json({ success: true, data: item });

  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false });
  }
};

exports.decreaseStock = async (req, res) => {
  try {
    const { qty } = req.body;

    const item = await StockItems.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Not found" });

    if (item.quantity < qty)
      return res.status(400).json({
        success: false,
        message: "Not enough stock",
      });

    const newQty = item.quantity - qty;
    const status = getStockStatus(newQty, item.threshold);

    item.quantity = newQty;
    item.status = status;

    await item.save();

    res.json({ success: true, data: item });

  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false });
  }
};

