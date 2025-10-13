import Site from "../models/masters/site.modal.js";

export const createSite = async (req, res) => {
  try {
    const site = await Site.create(req.body);
    res.status(201).json(site);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getAllSites = async (req, res) => {
  const sites = await Site.find();
  res.json(sites);
};

export const updateSite = async (req, res) => {
  const site = await Site.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(site);
};

export const deleteSite = async (req, res) => {
  await Site.findByIdAndDelete(req.params.id);
  res.json({ message: "Site deleted successfully" });
};
