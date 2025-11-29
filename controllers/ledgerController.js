import Ledger from "../models/Ledger.modal.js";
import Landlord from "../models/LandLord.modal.js";
import Billing from "../models/Billing.modal.js";

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

export const getAllLedgers = async (req, res) => {
  try {
    const {
      from,
      to,
      type,
      siteId,
      unitId,
      landlordId,
      tenantId,
      search,
      isPagination = "true",
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    // ---------------------------
    // 1️⃣ Date Filter
    // ---------------------------
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    // ---------------------------
    // 2️⃣ Type Filter
    // ---------------------------
    if (type) query.transactionType = type;

    // ---------------------------
    // 3️⃣ Reference Filters
    // ---------------------------
    if (siteId) query.siteId = siteId;
    if (unitId) query.unitId = unitId;
    if (landlordId) query.landlordId = landlordId;
    if (tenantId) query.tenantId = tenantId;

    // ---------------------------
    // 4️⃣ Global Search Filter
    // ---------------------------
    if (search) {
      query.$or = [
        { billNo: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { landlordName: { $regex: search, $options: "i" } },
        { tenantName: { $regex: search, $options: "i" } },
        { siteName: { $regex: search, $options: "i" } },
        { unitName: { $regex: search, $options: "i" } },
      ];
    }

    // ---------------------------
    // 5️⃣ Pagination Logic
    // ---------------------------
    let ledgers;
    let total;

    if (isPagination === "false") {
      // No pagination → return all records
      ledgers = await Ledger.find(query).sort({ createdAt: -1 });
      total = ledgers.length;
    } else {
      const skip = (page - 1) * limit;

      ledgers = await Ledger.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("billId",)
        .populate("siteId","siteName")
        .populate("unitId", "unitNumber")
        .populate("landlordId", "name");

      total = await Ledger.countDocuments(query);
    }

    return res.status(200).json({
      success: true,
      isPagination: isPagination === "true",
      total,
      page: Number(page),
      pages: isPagination === "true" ? Math.ceil(total / limit) : 1,
      data: ledgers,
    });
  } catch (error) {
    console.error("Get All Ledgers Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ledgers",
      error: error.message,
    });
  }
};

export const getConsolidatedPayable = async (req, res) => {
  try {
    const { landlordId } = req.params;

    if (!landlordId) {
      return res.status(400).json({
        success: false,
        message: "landlordId is required",
      });
    }

    // 1️⃣ Fetch latest ledger closing balance
    const lastLedger = await Ledger.findOne({ landlordId }).sort({
      createdAt: -1,
    });

    let balanceAmount = lastLedger?.closingBalance?.amount || 0;
    let balanceType = lastLedger?.closingBalance?.type || null;

    // Convert to numeric:
    // Credit = negative (advance), Debit = positive (due)
    let currentBalance =
      balanceType === "Debit"
        ? balanceAmount
        : balanceType === "Credit"
        ? -balanceAmount
        : 0;

    // 2️⃣ Fetch all unpaid bills
    const unpaidBills = await Billing.find({
      landlordId,
      status: "Unpaid",
    }).sort({ generatedOn: 1 });

    let consolidated = [];
    let totalPayable = 0;

    // 3️⃣ Process each unpaid bill
    for (const bill of unpaidBills) {
      let billAmount = bill.totalAmount;
      let billPayable = 0;

      // CASE 1: CREDIT available (advance)
      if (currentBalance < 0) {
        const advance = Math.abs(currentBalance);

        if (advance >= billAmount) {
          // AUTO-PAY THE BILL ✔
          await Billing.findByIdAndUpdate(
            bill._id,
            {
              status: "Paid",
              paidAt: new Date(),
              paidBy: "Auto",
              payerId: null,
            },
            { new: true }
          );

          billPayable = 0;
          currentBalance += billAmount; // reduce advance (less negative)
        } else {
          // Partial advance, bill still payable
          billPayable = billAmount - advance;
          currentBalance = billPayable; // becomes debit
        }
      }
      // CASE 2: DEBIT (no advance, landlord owes)
      else {
        billPayable = currentBalance + billAmount;
        currentBalance = billPayable;
      }

      // Add only real payable bills (exclude auto-paid bills)
      if (billPayable > 0) {
        totalPayable += billPayable;
      }

      consolidated.push({
        billId: bill._id,
        billAmount,
        billPayable,
        autoPaid: billPayable === 0,
      });
    }

    // 4️⃣ Determine final balance type
    const finalBalanceType =
      currentBalance > 0 ? "Debit" : currentBalance < 0 ? "Credit" : null;

    const finalBalanceAmount = Math.abs(currentBalance);

    return res.status(200).json({
      success: true,
      totalBills: unpaidBills.length,
      totalPayable,
      finalBalance: {
        amount: finalBalanceAmount,
        type: finalBalanceType,
      },
      bills: consolidated,
    });
  } catch (error) {
    console.error("Consolidated Payable Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate payable amount",
      error: error.message,
    });
  }
};
