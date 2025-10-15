import Tenant from "../models/Tenant.modal.js";
import Landlord from "../models/LandLord.modal.js";
import Unit from "../models/masters/Unit.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";
import Site from "../models/masters/site.modal.js";
import Project from "../models/masters/Project.modal.js";

export const addTenant = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      address,
      profilePic,
      siteId,
      projectId,
      unitId,
      landlordId,
      addedBy,
      billTo,
      isActive = true, // Default to true
    } = req.body;

    // 🧩 Validation
    const missingFields = [];
    if (!name) missingFields.push("name");
    if (!phone) missingFields.push("phone");
    if (!siteId) missingFields.push("siteId");
    if (!projectId) missingFields.push("projectId");
    if (!unitId) missingFields.push("unitId");
    if (!landlordId) missingFields.push("landlordId");
    if (!addedBy) missingFields.push("addedBy");

    if (missingFields.length)
      return sendError(
        res,
        `Missing required field(s): ${missingFields.join(", ")}`,
        400,
        "Validation Error"
      );

    // ✅ Validate references
    const landlord = await Landlord.findById(landlordId);
    if (!landlord) return sendError(res, "Landlord not found.", 404);

    const unit = await Unit.findById(unitId);
    if (!unit) return sendError(res, "Unit not found.", 404);

    // 🔄 DEACTIVATE OTHER ACTIVE TENANTS IN THIS UNIT
    if (isActive) {
      const otherTenants = await Tenant.find({ unitId, isActive: true });
      for (const other of otherTenants) {
        other.isActive = false;
        other.tenancyEndDate = new Date();
        await other.save();

        // Update the existing tenantHistory entry instead of pushing new
        const historyEntry = unit.tenantHistory.find(
          (h) => String(h.tenantId) === String(other._id) && h.isActive === true
        );
        if (historyEntry) {
          historyEntry.endDate = other.tenancyEndDate;
          historyEntry.isActive = false;
        }
      }
    }

    // 🏗 Create new tenant
    const tenant = await Tenant.create({
      name,
      phone,
      email,
      address,
      profilePic,
      siteId,
      projectId,
      unitId,
      landlordId,
      addedBy,
      billTo,
      isActive,
      tenancyStartDate: new Date(),
    });

    // ✅ Update unit reference & history
    if (isActive) unit.tenantId = tenant._id;
    unit.tenantHistory.push({
      tenantId: tenant._id,
      startDate: tenant.tenancyStartDate,
      addedBy: tenant.addedBy,
      billTo: tenant.billTo,
      isActive: tenant.isActive,
    });
    await unit.save();
    return sendSuccess(res, "Tenant added successfully.", tenant, 201);
  } catch (err) {
    console.error("Add Tenant Error:", err);
    return sendError(res, "Failed to add tenant.", 500, err.message);
  }
};

// 🟡 Get Tenants (with filters + pagination)
export const getTenants = async (req, res) => {
  try {
    const {
      search,
      siteId,
      projectId,
      landlordId,
      unitId,
      isActive,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};
    if (siteId) query.siteId = siteId;
    if (projectId) query.projectId = projectId;
    if (landlordId) query.landlordId = landlordId;
    if (unitId) query.unitId = unitId;
    if (isActive !== undefined) query.isActive = isActive === "true";
    if (search)
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];

    const tenants = await Tenant.find(query)
      .populate("siteId projectId unitId landlordId")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    if (tenants.length === 0) {
      return sendSuccess(
        res,
        "No tenants found.",
        { tenants: [], total: 0, page: Number(page), limit: Number(limit) },
        200
      );
    }

    const total = await Tenant.countDocuments(query);

    return sendSuccess(
      res,
      "Tenants fetched successfully.",
      {
        tenants,
        total,
        page: Number(page),
        limit: Number(limit),
      },
      200
    );
  } catch (err) {
    console.error("Get Tenants Error:", err);
    return sendError(res, "Failed to fetch tenants.", 500, err?.message);
  }
};

// 🟢 Get single Tenant
export const getTenantById = async (req, res) => {
  if (req?.params?.id === undefined || req?.params?.id === null) {
    return sendError(res, "Tenant ID is required", 400, "Tenant ID is missing");
  }
  try {
    const tenant = await Tenant.findById(req.params.id).populate(
      "siteId projectId unitId landlordId"
    );
    if (!tenant)
      return res
        .status(404)
        .json({ success: false, message: "Tenant not found." });

    res.status(200).json({ success: true, data: tenant });
  } catch (err) {
    console.error("Get Tenant Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const updateTenant = async (req, res) => {
  try {
    const tenantId = req.params.id;
    if (!tenantId) return sendError(res, "Tenant ID is required", 400);

    if (Object.keys(req.body).length === 0)
      return sendError(res, "No data provided for update", 400);

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return sendError(res, "Tenant not found.", 404);

    const { isActive, ...updates } = req.body;

    const unit = await Unit.findById(tenant.unitId);
    if (!unit) return sendError(res, "Unit not found.", 404);

    // 🔄 DEACTIVATE OTHER ACTIVE TENANTS IF CURRENT TENANT IS ACTIVATED
    if (isActive === true) {
      const otherTenants = await Tenant.find({
        unitId: tenant.unitId,
        _id: { $ne: tenant._id },
        isActive: true,
      });

      for (const other of otherTenants) {
        other.isActive = false;
        other.tenancyEndDate = new Date();
        await other.save();

        // Update the existing tenantHistory entry
        const historyEntry = unit.tenantHistory.find(
          (h) => String(h.tenantId) === String(other._id) && h.isActive === true
        );
        if (historyEntry) {
          historyEntry.endDate = other.tenancyEndDate;
          historyEntry.isActive = false;
        }
      }
    }

    // Apply updates to tenant
    Object.assign(tenant, updates);
    if (isActive !== undefined) tenant.isActive = isActive;
    if (isActive === true && !tenant.tenancyStartDate)
      tenant.tenancyStartDate = new Date();

    await tenant.save();

    // ✅ Update or push tenant history
    let historyEntry = unit.tenantHistory.find(
      (h) => String(h.tenantId) === String(tenant._id) && h.isActive === true
    );

    if (historyEntry) {
      historyEntry.startDate = tenant.tenancyStartDate;
      historyEntry.endDate = tenant.tenancyEndDate || undefined;
      historyEntry.isActive = tenant.isActive;
    } else {
      unit.tenantHistory.push({
        tenantId: tenant._id,
        startDate: tenant.tenancyStartDate,
        endDate: tenant.tenancyEndDate || undefined,
        addedBy: tenant.addedBy,
        billTo: tenant.billTo,
        isActive: tenant.isActive,
      });
    }

    // Update unit tenant reference
    if (isActive === true) unit.tenantId = tenant._id;

    await unit.save();

    return sendSuccess(res, "Tenant updated successfully.", tenant, 200);
  } catch (err) {
    console.error("Update Tenant Error:", err);
    return sendError(res, "Failed to update tenant.", 500, err.message);
  }
};

// 🔴 Delete / Archive Tenant
export const deleteTenant = async (req, res) => {
  try {
    const tenantId = req.params.id;
    if (!tenantId)
      return sendError(res, "Tenant ID is required", 400, "Missing ID");

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return sendError(res, "Tenant not found.", 404);

    tenant.isActive = false;
    tenant.tenancyEndDate = new Date();
    await tenant.save();

    const unit = await Unit.findById(tenant.unitId);
    if (unit) {
      // Update existing tenant history in unit
      const historyEntry = unit.tenantHistory.find(
        (h) => String(h.tenantId) === String(tenant._id) && h.isActive === true
      );
      if (historyEntry) {
        historyEntry.endDate = tenant.tenancyEndDate;
        historyEntry.isActive = false;
      }

      // Clear unit tenant reference if it's the same tenant
      if (String(unit.tenantId) === String(tenant._id)) {
        unit.tenantId = null;
      }

      await unit.save();
    }

    return sendSuccess(res, "Tenant archived successfully.", tenant, 200);
  } catch (err) {
    console.error("Delete Tenant Error:", err);
    return sendError(res, "Server Error", 500, err.message);
  }
};
