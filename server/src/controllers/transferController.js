import Transfer from "../models/Transfer.js";
import Account from "../models/Account.js";
import { deductBalance, addBalance } from "../helpers/accountBalance.js";

export const createTransfer = async (req, res) => {
  try {
    const { userId, fromAccountId, toAccountId, amount, note, transferDate } =
      req.body;

    if (!fromAccountId || !toAccountId) {
      return res.status(400).json({
        success: false,
        message: "Both source and destination accounts are required",
      });
    }

    if (fromAccountId === toAccountId) {
      return res.status(400).json({
        success: false,
        message: "Source and destination accounts must be different",
      });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    const fromAccount = await Account.findById(fromAccountId);

    if (!fromAccount) {
      return res.status(404).json({
        success: false,
        message: "Source account not found",
      });
    }

    const toAccount = await Account.findById(toAccountId);

    if (!toAccount) {
      return res.status(404).json({
        success: false,
        message: "Destination account not found",
      });
    }

    if (Number(fromAccount.balance) < Number(amount)) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance in source account",
      });
    }

    await deductBalance(fromAccountId, amount);
    await addBalance(toAccountId, amount);

    const transfer = await Transfer.create({
      userId,
      fromAccountId,
      toAccountId,
      amount,
      note,
      transferDate: transferDate || Date.now(),
    });

    res.status(201).json({
      success: true,
      data: transfer,
    });
  } catch (error) {
    console.error("Transfer Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTransfersByUser = async (req, res) => {
  try {
    const transfers = await Transfer.find({
      userId: req.params.userId,
    }).sort({
      transferDate: -1,
    });

    res.json({
      success: true,
      data: transfers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: "Transfer not found",
      });
    }

    await addBalance(transfer.fromAccountId, transfer.amount);
    await deductBalance(transfer.toAccountId, transfer.amount);

    await Transfer.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Transfer deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Editing reverses the original movement in full and applies the new one,
// rather than nudging the existing accounts by a difference. That is what
// makes changing the accounts - not just the amount - come out right: a
// difference-based adjustment would credit the old pair and never touch the
// new one.
export const updateTransfer = async (req, res) => {
  try {
    const existing = await Transfer.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Transfer not found",
      });
    }

    const fromAccountId = req.body.fromAccountId ?? existing.fromAccountId;
    const toAccountId = req.body.toAccountId ?? existing.toAccountId;
    const amount = Number(req.body.amount ?? existing.amount);

    if (String(fromAccountId) === String(toAccountId)) {
      return res.status(400).json({
        success: false,
        message: "Source and destination accounts must be different",
      });
    }

    if (!(amount > 0)) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    const [fromAccount, toAccount] = await Promise.all([
      Account.findById(fromAccountId),
      Account.findById(toAccountId),
    ]);

    if (!fromAccount || !toAccount) {
      return res.status(404).json({
        success: false,
        message: !fromAccount
          ? "Source account not found"
          : "Destination account not found",
      });
    }

    // Back out the old movement first, so the funds check below sees the
    // balance as it would be without this transfer.
    await addBalance(existing.fromAccountId, existing.amount);
    await deductBalance(existing.toAccountId, existing.amount);

    const refreshed = await Account.findById(fromAccountId);

    // A credit card is funded by its limit, not a positive balance, so it is
    // not held to the same test.
    const isCard = refreshed.type === "Credit Card";

    if (!isCard && Number(refreshed.balance) < amount) {
      // Put the original movement back before refusing, or the edit would
      // leave the balances changed by a rejected request.
      await deductBalance(existing.fromAccountId, existing.amount);
      await addBalance(existing.toAccountId, existing.amount);

      return res.status(400).json({
        success: false,
        message: `Insufficient balance in ${refreshed.name}`,
      });
    }

    await deductBalance(fromAccountId, amount);
    await addBalance(toAccountId, amount);

    existing.set({
      fromAccountId,
      toAccountId,
      amount,
      note: req.body.note ?? existing.note,
      transferDate: req.body.transferDate ?? existing.transferDate,
    });

    const updated = await existing.save();

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
