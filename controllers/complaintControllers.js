import Complaint from "../models/Complaints.modal.js";

// USER - Create a complaint
export const createComplaint = async (req, res) => {
  try {
    const { siteId, projectId, unitId, complaintTitle, complaintDescription, images } = req.body;

    const complaint = await Complaint.create({
      siteId,
      projectId,
      unitId,
      userId: req.user.id,
      complaintTitle,
      complaintDescription,
      images,
    });

    res.status(201).json({
      success: true,
      message: "Complaint submitted successfully",
      data: complaint,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// SUPERVISOR - Review complaint
export const reviewComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, supervisorComments, supervisorImages } = req.body;

    const complaint = await Complaint.findByIdAndUpdate(
      id,
      {
        status: status || "Under Review",
        supervisorId: req.user.id,
        supervisorComments,
        supervisorImages,
        verifiedAt: new Date(),
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Complaint reviewed successfully",
      data: complaint,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// SUPERVISOR or ADMIN - Mark as resolved
export const resolveComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolvedImages } = req.body;

    const complaint = await Complaint.findByIdAndUpdate(
      id,
      {
        status: "Resolved",
        resolvedBy: req.user.id,
        resolvedImages,
        resolvedAt: new Date(),
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Complaint marked as resolved",
      data: complaint,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ADMIN - Get all complaints
export const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("userId", "name email")
      .populate("supervisorId", "name email")
      .populate("resolvedBy", "name email")
      .populate("siteId", "sitename")
      .populate("projectId", "projectname")
      .populate("unitId", "unitType unitNumber");

    res.status(200).json({
      success: true,
      data: complaints,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
