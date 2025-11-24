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
    const {
      categoryId,
      search,
      page = 1,
      limit = 10,
      isPagination = "true",
    } = req.query;

    const filter = {};

    // Filter by categoryId if provided
    if (categoryId) filter.categoryId = categoryId;

    // Search by name or description
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Total count for pagination (used for both cases)
    const totalRecords = await SubCategory.countDocuments(filter);
    const totalPages = Math.ceil(totalRecords / limit);

    let list;

    // ⚡ If pagination is disabled, return full list
    if (isPagination === "false") {
      list = await SubCategory.find(filter).sort({ name: 1 });

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

    // ⚡ If pagination is enabled
    const skip = (page - 1) * limit;

    list = await SubCategory.find(filter)
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
