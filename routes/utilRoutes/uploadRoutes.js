import express from "express";
import upload from "../../middleware/upload.js";

const router = express.Router();

// Single image upload
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file || !req.file.path)
      return res.status(400).json({ message: "No image uploaded" });

    res.status(200).json({
      message: "Image uploaded successfully",
      imageUrl: req.file.path,
    });
  } catch (error) {
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
});

export default router;
