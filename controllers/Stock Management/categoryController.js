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
  const { search } = req.query;
  const filter = {};
  if (search) filter.name = { $regex: search, $options: "i" };
  const cats = await Category.find(filter).sort({ name: 1 });
  res.json({ success: true, data: cats });
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
