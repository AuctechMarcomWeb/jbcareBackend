import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/Auth/authRoutes.js";
import userRoutes from "./routes/User/userRoutes.js";
import siteRoutes from "./routes/masters/siteRoutes.js";
import projectRoutes from "./routes/masters/projectRoutes.js";
import unitTypeRoutes from "./routes/masters/unitTypeRoutes.js";
import unitRoutes from "./routes/masters/unitRoutes.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sites", siteRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/unit-types", unitTypeRoutes);
app.use("/api/units", unitRoutes);

// basic root
app.get("/", (req, res) => res.send("API running"));

// global 404
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
