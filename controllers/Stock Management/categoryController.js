import Category from "../../models/masters/Category.modal.js";

export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const cat = new Category({ name, description });
    await cat.save();
    res.status(201).json({ success: true, data: cat });
  } catch (err) {
    if (err.code === 11000)
      return res
        .status(400)
        .json({ success: false, message: "Category already exists" });
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, isPagination = "true" } = req.query;

    const filter = {};

    // 🔍 Search in name or description
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // 📌 Count total documents (for pagination or full list)
    const totalRecords = await Category.countDocuments(filter);
    const totalPages = Math.ceil(totalRecords / limit);

    let list;

    // ⚡ If pagination disabled → return full list
    if (isPagination === "false") {
      list = await Category.find(filter).sort({ name: 1 });

      return res.json({
        success: true,
        data: list,
        pagination: {
          page: null,
          limit: null,
          totalRecords: list.length,
          totalPages: 1,
        },
      });
    }

    // ⚡ Pagination enabled → apply skip/limit
    const skip = (page - 1) * limit;

    list = await Category.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(Number(limit));

    return res.json({
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
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateCategory = async (req, res) => {
  const updated = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!updated)
    return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data: updated });
};

export const deleteCategory = async (req, res) => {
  // soft delete
  const cat = await Category.findByIdAndDelete(req.params.id);
  if (!cat)
    return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data: cat });
};
