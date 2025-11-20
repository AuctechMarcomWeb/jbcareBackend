
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
    const { search } = req.query;

    const filter = { isDeleted: false }; // 👈 show only active (not deleted)

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const list = await Warehouse.find(filter).sort({ name: 1 });

    return res.json({
      success: true,
      data: list,
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
