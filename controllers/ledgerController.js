import Ledger from "../models/Ledger.modal.js";
import Landlord from "../models/LandLord.modal.js";

export const calculateClosingBalance = (opening, amount, transactionType) => {
  let current =
    opening.type === "Debit"
      ? opening.amount
      : opening.type === "Credit"
      ? -opening.amount
      : 0;

  if (transactionType === "Bill") current += amount;
  else current -= amount;

  let type = null;
  let finalAmount = Math.abs(current);

  if (current > 0) type = "Debit";
  else if (current < 0) type = "Credit";

  return {
    amount: finalAmount,
    type,
  };
};

export const getOpeningBalance = async (landlordId) => {
  const lastLedger = await Ledger.findOne({ landlordId }).sort({
    createdAt: -1,
  });

  if (lastLedger) {
    return {
      amount: lastLedger.closingBalance.amount,
      type: lastLedger.closingBalance.type,
    };
  }

  // No ledger → use landlord opening balance
  const landlord = await Landlord.findById(landlordId);
  return {
    amount: landlord?.openingBalance?.amount || 0,
    type: landlord?.openingBalance?.type || null,
  };
};

export const createLedger = async (req, res) => {
  try {
    const {
      landlordId,
      siteId,
      unitId,
      billId,
      purpose,
      amount,
      transactionType,
    } = req.body;

    if (!landlordId || !siteId || !unitId || !amount || !transactionType)
      return res.status(400).json({
        success: false,
        message: "Required fields missing.",
      });

    // 1️⃣ Opening balance
    const openingBalance = await getOpeningBalance(landlordId);

    // 2️⃣ Closing balance
    const closingBalance = calculateClosingBalance(
      openingBalance,
      amount,
      transactionType
    );

    // 3️⃣ Create Ledger Entry
    const ledger = await Ledger.create({
      landlordId,
      siteId,
      unitId,
      billId,
      purpose,
      amount,
      transactionType,
      openingBalance,
      closingBalance,
    });

    return res.status(201).json({
      success: true,
      message: "Ledger entry created successfully",
      data: ledger,
    });
  } catch (error) {
    console.error("Ledger Creation Error:", error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const createLedgerEntry = async (
  landlordId,
  siteId,
  unitId,
  billId = null,
  purpose,
  amount,
  transactionType // "Bill" or "Payment"
) => {
  // 1️⃣ Fetch last ledger
  const lastLedger = await Ledger.findOne({ landlordId }).sort({
    createdAt: -1,
  });

  let openingAmount = 0;
  let openingType = null;

  // 2️⃣ CASE 1: No ledger → use landlord.openingBalance
  if (!lastLedger) {
    const landlord = await Landlord.findById(landlordId);

    openingAmount = landlord.openingBalance.amount;
    openingType = landlord.openingBalance.type;
  } else {
    // 3️⃣ CASE 2: Use last ledger closingBalance
    openingAmount = lastLedger.closingBalance.amount;
    openingType = lastLedger.closingBalance.type;
  }

  // Convert opening balance into a signed number
  let currentBalance =
    openingType === "Debit"
      ? openingAmount
      : openingType === "Credit"
      ? -openingAmount
      : 0;

  // 4️⃣ Apply transaction
  if (transactionType === "Bill") {
    currentBalance += amount; // Increase due
  } else if (transactionType === "Payment") {
    currentBalance -= amount; // Reduce due
  }

  // 5️⃣ Convert result into Debit / Credit type
  let closingType = null;
  let closingAmount = Math.abs(currentBalance);

  if (currentBalance > 0) closingType = "Debit";
  else if (currentBalance < 0) closingType = "Credit";

  // 6️⃣ Create Ledger Entry
  const ledger = await Ledger.create({
    landlordId,
    siteId,
    unitId,
    billId,
    purpose,
    amount,
    transactionType,

    openingBalance: {
      amount: openingAmount,
      type: openingType,
    },
    closingBalance: {
      amount: closingAmount,
      type: closingType,
    },
  });

  return ledger;
};

export const getLedgerByLandlord = async (req, res) => {
  try {
    const { landlordId } = req.params;

    const ledger = await Ledger.find({ landlordId })
      .populate("billId")
      .populate("unitId")
      .populate("siteId")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: ledger.length,
      data: ledger,
    });
  } catch (error) {
    console.error("Get Ledger Error:", error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};
