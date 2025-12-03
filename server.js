import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

import "./utils/cron-jobs.js";
import authRoutes from "./routes/Auth/authRoutes.js";
import userRoutes from "./routes/User/userRoutes.js";
import siteRoutes from "./routes/masters/siteRoutes.js";
import projectRoutes from "./routes/masters/projectRoutes.js";
import unitTypeRoutes from "./routes/masters/unitTypeRoutes.js";
import unitRoutes from "./routes/masters/unitRoutes.js";
import complaintRoutes from "./routes/User/complaintRoutes.js";
import uploadRoutes from "./routes/utilRoutes/uploadRoutes.js";
import landlordRoutes from "./routes/User/landlordRoutes.js";
import tenantRoutes from "./routes/User/tenantRoutes.js";
import supervisorRoutes from "./routes/User/supervisorRoutes.js";
import maintainCharge from "./routes/masters/maintainChargesRoutes.js";
import maintenanceBillRoutes from "./routes/Bills/maintenanceBillRoutes.js";
import billingRoutes from "./routes/Bills/BillingRoutes.js";
import dashboardRoutes from "./routes/dashboard/dashboard.js";
import statsRoutes from "./routes/stats/statsRoutes.js";
import walletRoutes from "./routes/Payment/walletRoutes.js";
import problemTypeRoutes from "./routes/masters/problemTypeRoutes.js";
import categoryRoutes from "./routes/masters/categoryRoutes.js";
import subCategoryRoutes from "./routes/masters/subCategoryRoutes.js";
import warehouseRoutes from "./routes/masters/warehouseRoutes.js";
import stocksRoutes from "./routes/Stocks/stocksRoutes.js";
import stockDemand from "./routes/Stocks/demandRoutes.js";
import meterRoutes from "./routes/Bills/MeterRoutes.js";
import ledgerRoutes from "./routes/Bills/ledgerRoutes.js";
import transferRoutes from "./routes/Stocks/stockTransferRoutes.js";

dotenv.config();
connectDB();
const app = express();

const clientUrl = process.env.CLIENT_URL;
app.use(
  cors({
    origin:["http://localhost:3000","http://192.168.1.19:3000"] ,
    // origin: clientUrl || "*",
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sites", siteRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/unit-types", unitTypeRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/landlords", landlordRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/supervisors", supervisorRoutes);
app.use("/api/maintain-charges", maintainCharge);
app.use("/api/maintenance-bill", maintenanceBillRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/problem-types", problemTypeRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/sub-category", subCategoryRoutes);
app.use("/api/warehouse", warehouseRoutes);
app.use("/api/stocks", stocksRoutes);
app.use("/api/demand", stockDemand);
app.use("/api/meter", meterRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/transfer", transferRoutes);

app.use("/api", uploadRoutes);

// basic root
app.get("/", (req, res) => res.send("API running"));

// global 404
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
