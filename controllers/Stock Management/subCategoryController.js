import SubCategory from "../../models/masters/SubCategory.modal.js";

export const createSubCategory = async (req, res) => {
  try {
    const sc = new SubCategory(req.body);
    await sc.save();
    res.status(201).json({ success: true, data: sc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSubCategories = async (req, res) => {
  try {
    const { categoryId, search, page = 1, limit = 10 } = req.query;

    const filter = {};

    // Filter by categoryId if provided
    if (categoryId) filter.categoryId = categoryId;

    // Search in both name & description
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    // Count total documents based on applied filters
    const totalRecords = await SubCategory.countDocuments(filter);
    const totalPages = Math.ceil(totalRecords / limit);

    // Fetch paginated list
    const list = await SubCategory.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      data: list,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalRecords,
        totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateSubCategory = async (req, res) => {
  const updated = await SubCategory.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!updated)
    return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data: updated });
};

export const deleteSubCategory = async (req, res) => {
  const sc = await SubCategory.findByIdAndDelete(req.params.id, { new: true });
  if (!sc)
    return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data: sc });
};
