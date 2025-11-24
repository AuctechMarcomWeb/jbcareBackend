import ProcurementRequest from "../../models/Stock management/ProcurementRequest.model.js";
import StockItems from "../../models/Stock management/StockItems.modal.js";

export const createProcurement = async (req, res) => {
  try {
    const { itemId, requestedQty, notes, demandId, requestedBy } = req.body;

    const proc = await ProcurementRequest.create({
      itemId,
      requestedQty,
      notes,
      demandId,
      requestedBy,
    });

    res.status(201).json({
      success: true,
      message: "Procurement request created",
      data: proc,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const markProcurementOrdered = async (req, res) => {
  try {
    const { procurementId } = req.params;

    const proc = await ProcurementRequest.findById(procurementId);
    if (!proc) return res.status(404).json({ success: false, message: "Not found" });

    proc.status = "ORDERED";
    proc.approvedBy = req.body.approvedBy;
    await proc.save();

    res.json({ success: true, message: "Procurement marked as ORDERED", data: proc });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const markProcurementReceived = async (req, res) => {
  try {
    const { procurementId } = req.params;

    const proc = await ProcurementRequest.findById(procurementId);
    if (!proc) return res.status(404).json({ success: false, message: "Not found" });

    // Add to warehouse stock
    await StockItems.findByIdAndUpdate(proc.itemId, {
      $inc: { quantity: proc.requestedQty }
    });

    proc.status = "RECEIVED";
    proc.receivedBy = req.body.receivedBy;
    await proc.save();

    res.json({ success: true, message: "Stock received & updated", data: proc });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
