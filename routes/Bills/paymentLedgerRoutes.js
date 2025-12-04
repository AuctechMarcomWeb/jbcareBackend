import express from "express";
import { createLedgerEntry, deleteLedgerEntry, getAllLedgerEntries, getLedgerEntryById, updateLedgerEntry } from "../../controllers/PaymentLedgerController.js";


const router = express.Router();

// CREATE Ledger Entry
router.post("/create", createLedgerEntry);

// GET All Ledger Entries
router.get("/all", getAllLedgerEntries);

// GET Single Ledger Entry by ID
router.get("/:id", getLedgerEntryById);

// UPDATE Ledger Entry
router.put("/:id", updateLedgerEntry);

// DELETE Ledger Entry
router.delete("/:id", deleteLedgerEntry);

export default router;
