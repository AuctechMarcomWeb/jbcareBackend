import Tenant from "../models/Tenant.modal.js";
import Landlord from "../models/LandLord.modal.js";
import Unit from "../models/masters/Unit.modal.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";
import Site from "../models/masters/site.modal.js";
import Project from "../models/masters/Project.modal.js";

// 🟢 Add Tenant
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
    } = req.body;

    if (
      !name ||
      !phone ||
      !siteId ||
      !projectId ||
      !unitId ||
      !landlordId ||
      !addedBy
    ) {
      const missingFields = [];
      if (!name) missingFields.push("name");
      if (!phone) missingFields.push("phone");
      if (!siteId) missingFields.push("siteId");
      if (!projectId) missingFields.push("projectId");
      if (!unitId) missingFields.push("unitId");
      if (!landlordId) missingFields.push("landlordId");
      if (!addedBy) missingFields.push("addedBy");

      return sendError(
        res,
        `Missing required field(s): ${missingFields.join(", ")}.`,
        400,
        "Validation Error"
      );
    }
    // Validate landlord & unit
    const landlord = await Landlord.findById(landlordId);
    if (!landlord) return sendError(res, "Landlord not found.", 404, null);

    const unit = await Unit.findById(unitId);
    if (!unit)
      return sendError(
        res,
        "Unit not found.",
        404,
        "Unit Id not found/invalid"
      );

    const site = await Site.findById(siteId);
    if (!site)
      return sendError(
        res,
        "Site not found.",
        404,
        "Site Id not found/invalid"
      );

    const project = await Project.findById(projectId);
    if (!project)
      return sendError(
        res,
        "Project not found.",
        404,
        "Project Id not found/invalid"
      );

    // Archive old active tenant for this unit
    // await Tenant.updateMany(
    //   { unitId, isActive: true },
    //   { $set: { isActive: false, tenancyEndDate: new Date() } }
    // );
    // ❌ Check if there is an active tenant already

    // Archive old active tenant if exists
    const activeTenant = await Tenant.findOne({ unitId, isActive: true });
    if (activeTenant) {
      activeTenant.isActive = false;
      activeTenant.tenancyEndDate = new Date();
      await activeTenant.save();

      unit.tenantHistory.push({
        tenantId: activeTenant._id,
        startDate: activeTenant.tenancyStartDate,
        endDate: activeTenant.tenancyEndDate,
        addedBy: activeTenant.addedBy,
        billTo: activeTenant.billTo,
      });
    }

    // Create new tenant
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
    });

    // Add new tenant to unit history as current
    unit.tenantHistory.push({
      tenantId: tenant._id,
      startDate: tenant.tenancyStartDate,
      addedBy: tenant.addedBy,
      billTo: tenant.billTo,
    });

    await unit.save();

    return sendSuccess(res, "Tenant added successfully.", tenant, 201);
  } catch (err) {
    console.error("Add Tenant Error:", err);
    return sendError(res, "Failed to add tenant.", 500, err?.message);
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

// 🟠 Update Tenant
export const updateTenant = async (req, res) => {
  if (req?.params?.id === undefined || req?.params?.id === null) {
    return sendError(res, "Tenant ID is required", 400, "Tenant ID is missing");
  }
  if (Object.keys(req.body).length === 0) {
    return sendError(res, "No data provided for update", 400, "Empty body");
  }
  try {
    const updates = req.body;
    const tenant = await Tenant.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    if (!tenant)
      return sendError(
        res,
        "Tenant not found.",
        404,
        "Tenant not found/invalid ID"
      );

    return sendSuccess(res, "Tenant fetched successfully.", tenant, 200);
  } catch (err) {
    console.error("Update Tenant Error:", err);
    return sendError(res, "Failed to fetch tenant.", 500, err?.message);
  }
};

// 🔴 Delete / Archive Tenant
export const deleteTenant = async (req, res) => {
  console.log("Delete Tenant Called with ID:", req.params.id);
  try {
    if (req?.params?.id === undefined || req?.params?.id === null) {
      return sendError(
        res,
        "Tenant ID is required",
        400,
        "Tenant ID is missing"
      );
    }
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant)
      return res
        .status(404)
        .json({ success: false, message: "Tenant not found." });

    tenant.isActive = false;
    tenant.tenancyEndDate = new Date();
    await tenant.save();

    const unit = await Unit.findById(tenant.unitId);
    if (unit) {
      unit.tenantHistory.push({
        tenantId: tenant._id,
        startDate: tenant.tenancyStartDate,
        endDate: tenant.tenancyEndDate,
        addedBy: tenant.addedBy,
        billTo: tenant.billTo,
      });
      await unit.save();
    }

    return sendSuccess(res, "Tenant archived successfully.", tenant, 200);
  } catch (err) {
    console.error("Delete Tenant Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
