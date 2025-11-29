import StockDemand from "../../models/Stock management/StockDemand.modal.js";
import StockItems from "../../models/Stock management/StockItems.modal.js";
import SupervisorStock from "../../models/Stock management/SupervisorStock.modal.js";
import ProcurementRequest from "../../models/Stock management/ProcurementRequest.modal.js";
import Warehouse from "../../models/masters/Warehouse.modal.js";

/**
 * Create Demand
 */
export const createDemand = async (req, res) => {
  try {
    const {
      itemId,
      siteId,
      complaintId,
      supervisorId,
      requestedQty,
      reason,
      requestedBy,
    } = req.body;

    const demand = await StockDemand.create({
      itemId,
      siteId,
      complaintId,
      supervisorId,
      requestedQty,
      approvedQty: 0,
      status: "PENDING",
      reason,
      requestedBy,
    });

    return res.status(201).json({
      success: true,
      message: "Demand created successfully",
      data: demand,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * Update Demand Status
 */
export const updateDemandStatus = async (req, res) => {
  try {
    const { demandId } = req.params;
    const { status, approvedQty, approvedBy, issuedBy, warehouseId } = req.body;

    const demand = await StockDemand.findById(demandId).populate("itemId");
    if (!demand)
      return res
        .status(404)
        .json({ success: false, message: "Demand not found" });

    const item = await StockItems.findById(demand.itemId._id);
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });

    // Status flow validation
    const flow = {
      PENDING: ["APPROVED", "REJECTED"],
      APPROVED: ["ISSUED", "REJECTED"],
      ISSUED: ["USED"],
      USED: [],
    };

    if (!flow[demand.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition: ${demand.status} → ${status}`,
      });
    }

    // 1️⃣ APPROVE
    if (status === "APPROVED") {
      if (!approvedQty)
        return res
          .status(400)
          .json({ success: false, message: "Approved quantity required" });

      // Require Warehouse ID
      if (!warehouseId)
        return res.status(400).json({
          success: false,
          message: "warehouseId is required for approval",
        });

      // Check warehouse stock
      const warehouseStock = Warehouse.find(warehouseId);

      if (!warehouseStock)
        return res.status(404).json({
          success: false,
          message: "Warehouse not found for this item",
        });

      if (approvedQty > item.quantity) {
        // Auto create procurement request
        await ProcurementRequest.create({
          itemId: item._id,
          requestedQty: approvedQty - item.quantity,
          demandId,
          requestedBy: approvedBy,
          warehouseId,
          notes: "Auto-generated due to insufficient stock",
        });

        return res.status(400).json({
          success: false,
          message: "Insufficient stock – Procurement Request created",
        });
      }

      // Deduct stock (atomic)
      await StockItems.findByIdAndUpdate(item._id, {
        $inc: { quantity: -approvedQty },
      });

      demand.status = "APPROVED";
      demand.approvedQty = approvedQty;
      demand.approvedBy = approvedBy;
      demand.warehouseId = warehouseId;
      await demand.save();

      return res.json({
        success: true,
        message: "Demand approved",
        data: demand,
      });
    }

    // 2️⃣ ISSUE
    if (status === "ISSUED") {
      const qty = demand.approvedQty;

      await SupervisorStock.findOneAndUpdate(
        { supervisorId: demand.supervisorId, itemId: demand.itemId },
        { $inc: { quantity: qty } },
        { upsert: true }
      );

      demand.status = "ISSUED";
      demand.issuedBy = issuedBy;
      await demand.save();

      return res.json({ success: true, message: "Item issued", data: demand });
    }

    // 3️⃣ REJECT
    if (status === "REJECTED") {
      demand.status = "REJECTED";
      demand.approvedQty = 0;
      demand.approvedBy = approvedBy;
      await demand.save();
      return res.json({
        success: true,
        message: "Demand rejected",
        data: demand,
      });
    }

    // 4️⃣ USED (Supervisor Stock Out)
    if (status === "USED") {
      const qty = demand.approvedQty;

      const supStock = await SupervisorStock.findOne({
        supervisorId: demand.supervisorId,
        itemId: demand.itemId,
      });

      if (!supStock || supStock.quantity < qty) {
        return res
          .status(400)
          .json({ success: false, message: "Not enough supervisor stock" });
      }

      await SupervisorStock.findByIdAndUpdate(supStock._id, {
        $inc: { quantity: -qty },
      });

      demand.status = "USED";
      await demand.save();

      return res.json({
        success: true,
        message: "Item marked as used",
        data: demand,
      });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * Get all demands + filters
 */
export const getDemands = async (req, res) => {
  try {
    const {
      status,
      supervisorId,
      siteId,
      complaintId,
      isPagination = "true",
      itemId,
      warehouseId,
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (siteId) filter.siteId = siteId;
    if (supervisorId) filter.supervisorId = supervisorId;
    if (complaintId) filter.complaintId = complaintId;
    if (itemId) filter.itemId = itemId;
    if (warehouseId) filter.warehouseId = warehouseId;

    filter.isDeleted = false;

    let demands;
    let total = 0;

    // -------------------------------------
    // PAGINATION LOGIC
    // -------------------------------------
    if (isPagination === "true") {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      total = await StockDemand.countDocuments(filter);

      demands = await StockDemand.find(filter)
        .skip(skip)
        .limit(limit)
        .populate("itemId")
        .populate("supervisorId")
        .populate("complaintId")
        .populate("siteId")
        .populate("warehouseId")
        .sort({ createdAt: -1 });

      return res.json({
        success: true,
        pagination: true,
        total,
        page,
        limit,
        data: demands,
      });
    }

    // -------------------------------------
    // WITHOUT PAGINATION
    // -------------------------------------
    demands = await StockDemand.find(filter)
      .populate("itemId")
      .populate("supervisorId")
      .populate("complaintId")
      .populate("siteId")
      .populate("warehouseId")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      pagination: false,
      count: demands.length,
      data: demands,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const getDemandById = async (req, res) => {
  try {
    const { demandId } = req.params;

    const demand = await StockDemand.findOne({
      _id: demandId,
      isDeleted: false,
    })
      .populate("itemId")
      .populate("supervisorId")
      .populate("complaintId")
      .populate("siteId");

    if (!demand) {
      return res.status(404).json({
        success: false,
        message: "Demand not found",
      });
    }

    return res.json({
      success: true,
      data: demand,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const updateDemand = async (req, res) => {
  try {
    const { demandId } = req.params;

    const updates = req.body;

    // Prevent editing restricted fields
    const restricted = ["status", "approvedQty", "approvedBy", "issuedBy"];
    restricted.forEach((field) => delete updates[field]);

    const demand = await StockDemand.findOneAndUpdate(
      { _id: demandId, isDeleted: false },
      updates,
      { new: true }
    );

    if (!demand) {
      return res.status(404).json({
        success: false,
        message: "Demand not found",
      });
    }

    return res.json({
      success: true,
      message: "Demand updated successfully",
      data: demand,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const deleteDemand = async (req, res) => {
  try {
    const { demandId } = req.params;

    const demand = await StockDemand.findOneAndUpdate(
      { _id: demandId },
      { isDeleted: true },
      { new: true }
    );

    if (!demand) {
      return res.status(404).json({
        success: false,
        message: "Demand not found",
      });
    }

    return res.json({
      success: true,
      message: "Demand deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
