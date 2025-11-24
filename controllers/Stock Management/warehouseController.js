import Warehouse from "../../models/masters/Warehouse.modal.js";

export const createWarehouse = async (req, res) => {
  try {
    const w = new Warehouse(req.body);
    await w.save();
    res.status(201).json({ success: true, data: w });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getWarehouses = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, isPagination = "true" } = req.query;

    const filter = { isDeleted: false };

    // 🔍 Search by name OR address
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }

    // 📌 Default pagination values
    let skip = (page - 1) * limit;

    // 📌 Total warehouses count based on filter
    const totalRecords = await Warehouse.countDocuments(filter);
    const totalPages = Math.ceil(totalRecords / limit);

    let list;

    // ⚡ If pagination = false → return full data
    if (isPagination === "false") {
      list = await Warehouse.find(filter).sort({ name: 1 });

      return res.json({
        success: true,
        data: list,
        page: null,
        limit: null,
        totalRecords: list.length,
        totalPages: 1,
      });
    }

    // ⚡ If pagination = true → use skip & limit
    list = await Warehouse.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(Number(limit));

    return res.json({
      success: true,
      data: list,

      page: Number(page),
      limit: Number(limit),
      totalRecords,
      totalPages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

export const updateWarehouse = async (req, res) => {
  const updated = await Warehouse.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!updated)
    return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data: updated });
};

export const deleteWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    return res.json({
      success: true,
      message: "Warehouse deleted (soft delete applied)",
      data: warehouse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};
