import ProblemTypeModal from "../models/masters/ProblemType.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

// ------------------------------------------------------
// CREATE
// ------------------------------------------------------
export const createProblemType = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) return sendError(res, "Problem type name is required");

    const exists = await ProblemTypeModal.findOne({
      name: name.trim(),
      isDeleted: false,
    });
    if (exists) return sendError(res, "This problem type already exists");

    const newType = await ProblemTypeModal.create({ name, description });

    return sendSuccess(res, "Problem type created successfully", newType);
  } catch (err) {
    return sendError(res, "Failed to create problem type", 500, err.message);
  }
};

// ------------------------------------------------------
// GET ALL (with filters)
// ------------------------------------------------------
export const getProblemTypes = async (req, res) => {
  try {
    const filters = { isDeleted: false };

    const list = await ProblemTypeModal.find(filters).sort({ createdAt: -1 });

    return sendSuccess(res, "Problem types fetched", list);
  } catch (err) {
    return sendError(res, "Failed to fetch problem types", 500, err.message);
  }
};

// ------------------------------------------------------
// GET ONE
// ------------------------------------------------------
export const getProblemTypeById = async (req, res) => {
  try {
    const { id } = req.params;

    const type = await ProblemTypeModal.findOne({ _id: id, isDeleted: false });
    if (!type) return sendError(res, "Problem type not found", 404);

    return sendSuccess(res, "Problem type fetched", type);
  } catch (err) {
    return sendError(res, "Failed to fetch problem type", 500, err.message);
  }
};

// ------------------------------------------------------
// UPDATE
// ------------------------------------------------------
export const updateProblemType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const type = await ProblemTypeModal.findOne({ _id: id, isDeleted: false });
    if (!type) return sendError(res, "Problem type not found", 404);

    // Prevent duplicate name
    if (name && name !== type.name) {
      const exists = await ProblemTypeModal.findOne({
        name: name.trim(),
        _id: { $ne: id },
        isDeleted: false,
      });
      if (exists)
        return sendError(
          res,
          "Another problem type with this name already exists"
        );
    }

    type.name = name || type.name;
    type.description = description || type.description;

    await type.save();

    return sendSuccess(res, "Problem type updated", type);
  } catch (err) {
    return sendError(res, "Failed to update problem type", 500, err.message);
  }
};

// ------------------------------------------------------
// DELETE (Soft Delete)
// ------------------------------------------------------
export const deleteProblemType = async (req, res) => {
  try {
    const { id } = req.params;

    const type = await ProblemTypeModal.findOne({ _id: id, isDeleted: false });
    if (!type) return sendError(res, "Problem type not found", 404);

    // Soft delete
    type.isDeleted = true;
    await type.save();

    return sendSuccess(res, "Problem type deleted");
  } catch (err) {
    return sendError(res, "Failed to delete problem type", 500, err.message);
  }
};
