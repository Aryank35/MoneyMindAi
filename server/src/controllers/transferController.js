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
