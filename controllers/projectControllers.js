import Project from "../models/masters/Project.modal.js";

export const createProject = async (req, res) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getAllProjects = async (req, res) => {
  const projects = await Project.find().populate(
    "siteId",
    "siteName siteAddress"
  );
  res.json(projects);
};

export const updateProject = async (req, res) => {
  const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(project);
};

export const deleteProject = async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  res.json({ message: "Project deleted successfully" });
};
