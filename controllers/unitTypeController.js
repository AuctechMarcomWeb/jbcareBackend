import UnitType from '../models/masters/UnitType.modal.js';

export const createUnitType = async (req, res) => {
  try {
    const unitType = await UnitType.create(req.body);
    res.status(201).json(unitType);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getAllUnitTypes = async (req, res) => {
  const unitTypes = await UnitType.find();
  res.json(unitTypes);
};

export const updateUnitType = async (req, res) => {
  const unitType = await UnitType.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(unitType);
};

export const deleteUnitType = async (req, res) => {
  await UnitType.findByIdAndDelete(req.params.id);
  res.json({ message: "UnitType deleted successfully" });
};
