import Unit from "../models/masters/Unit.modal.js";

export const createUnit = async (req, res) => {
  try {
    const unit = await Unit.create(req.body);
    res.status(201).json(unit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getAllUnits = async (req, res) => {
  const units = await Unit.find()
    .populate("siteId", "siteName")
    .populate("projectId", "projectName")
    .populate("unitTypeId", "title");
  res.json(units);
};

export const updateUnit = async (req, res) => {
  const unit = await Unit.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(unit);
};

export const deleteUnit = async (req, res) => {
  await Unit.findByIdAndDelete(req.params.id);
  res.json({ message: "Unit deleted successfully" });
};
