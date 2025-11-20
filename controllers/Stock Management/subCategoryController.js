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
  const { categoryId, search } = req.query;
  const filter = {};
  if (categoryId) filter.categoryId = categoryId;
  if (search) filter.name = { $regex: search, $options: "i" };
  const list = await SubCategory.find(filter).sort({ name: 1 });
  res.json({ success: true, data: list });
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
