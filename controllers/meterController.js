import Landlord from "../models/LandLord.modal.js";
import axios from "axios";
import MeterLogs from "../models/MeterLogs.modal.js";

export const toggleMeter = async (req, res) => {
  try {
    const { landlordId, OnOff, customerId, meterId, meterSerialNumber } =
      req.body;

    if (!landlordId || !OnOff) {
      return res.status(400).json({
        success: false,
        message: "landlordId and OnOff are required",
      });
    }

    if (!["ON", "OFF"].includes(OnOff.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "OnOff must be ON or OFF",
      });
    }

    // Fetch landlord
    const landlord = await Landlord.findById(landlordId);
    if (!landlord) {
      return res.status(404).json({
        success: false,
        message: "Landlord not found",
      });
    }

    const payload = {
      CustomerID: customerId,
      OnOff: OnOff.toUpperCase(),
    };

    // Call external API
    const elecRes = await axios.post(process.env.ELECTRICITY_API_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });

    // Add log entry
    const logEntry = {
      action: OnOff.toUpperCase(),
      response: elecRes.data,
      requestedBy: req.userId || null,
    };

    // Create or update
    const result = await MeterLogs.findOneAndUpdate(
      { landlordId },
      {
        landlordId,
        customerId,
        meterId,
        meterSerialNumber,
        currentStatus: OnOff.toUpperCase(),
        $push: { logs: logEntry },
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: `Meter turned ${OnOff.toUpperCase()}`,
      data: result,
    });
  } catch (err) {
    console.error("FULL ERROR:", err.response?.data || err.message);

    return res.status(500).json({
      success: false,
      message: "Meter toggle failed",
      error: err.response?.data || err.message,
    });
  }
};

export const getMeterLogs = async (req, res) => {
  try {
    const { landlordId } = req.params;

    if (!landlordId) {
      return res.status(400).json({
        success: false,
        message: "landlordId is required",
      });
    }

    // Validate landlord
    const landlord = await Landlord.findById(landlordId);
    if (!landlord) {
      return res.status(404).json({
        success: false,
        message: "Landlord not found",
      });
    }

    // Fetch logs
    const logs = await MeterLogs.find({ landlordId }).sort({ createdAt: -1 }); // latest logs first

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch meter logs",
      error: error.message,
    });
  }
};


export const getLatestMeterStatus = async (req, res) => {
  try {
    const { landlordId } = req.params;

    if (!landlordId) {
      return res.status(400).json({
        success: false,
        message: "landlordId is required",
      });
    }

    // Validate landlord
    const landlord = await Landlord.findById(landlordId);
    if (!landlord) {
      return res.status(404).json({
        success: false,
        message: "Landlord not found",
      });
    }

    // Get last action (ON or OFF)
    const lastLog = await MeterLogs.findOne({ landlordId }).sort({
      createdAt: -1,
    });

    if (!lastLog) {
      return res.status(200).json({
        success: true,
        status: "UNKNOWN",
        message: "No meter logs found",
      });
    }

    return res.status(200).json({
      success: true,
      status: lastLog.action, // ON / OFF
      lastUpdated: lastLog.createdAt,
      log: lastLog,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch meter status",
      error: error.message,
    });
  }
};


export const getAllMeterLogs = async (req, res) => {
  try {
    const {
      landlordId,
      customerId,
      meterId,
      meterSerialNumber,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = req.query;

    let filters = {};

    if (landlordId) filters.landlordId = landlordId;
    if (customerId) filters.customerId = customerId;
    if (meterId) filters.meterId = meterId;
    if (meterSerialNumber) filters.meterSerialNumber = meterSerialNumber;

    // Date Range Filter
    if (fromDate || toDate) {
      filters.createdAt = {};
      if (fromDate) filters.createdAt.$gte = new Date(fromDate);
      if (toDate) filters.createdAt.$lte = new Date(toDate);
    }

    const skip = (page - 1) * limit;

    const logs = await MeterLogs.find(filters)
      .sort({ createdAt: -1 })        // latest first
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MeterLogs.countDocuments(filters);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      data: logs,
    });

  } catch (error) {
    console.error("ERROR fetching meter logs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch meter logs",
      error: error.message,
    });
  }
};
