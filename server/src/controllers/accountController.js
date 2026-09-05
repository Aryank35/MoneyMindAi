import Account from "../models/Account.js";

// Only one account per user can be the salary account, so promoting one has to
// demote every other account the user owns.
const demoteOtherSalaryAccounts = async (userId, keepId) => {
  if (!userId) return;

  const filter = {
    userId,
    isSalaryAccount: true,
  };

  if (keepId) {
    filter._id = { $ne: keepId };
  }

  await Account.updateMany(filter, {
    $set: { isSalaryAccount: false },
  });
};

export const createAccount = async (req, res) => {
  try {
    const { userId, type } = req.body;

    // A user's very first bank account becomes the salary account so income
    // has somewhere to land without extra setup. Anyone who already has
    // accounts picks their own from the Accounts page instead - silently
    // re-pointing salary at a newly added account would be worse.
    const hasAccounts = await Account.exists({ userId });

    const isSalaryAccount =
      req.body.isSalaryAccount === true ||
      (!hasAccounts && (type || "Bank") === "Bank");

    if (isSalaryAccount) {
      await demoteOtherSalaryAccounts(userId);
    }

    const account = await Account.create({
      ...req.body,
      isSalaryAccount,
    });

    res.status(201).json({
      success: true,
      data: account,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAccountsByUser = async (req, res) => {
  try {
    const accounts = await Account.find({
      userId: req.params.userId,
    }).sort({
      isSalaryAccount: -1,
      createdAt: 1,
    });

    res.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateAccount = async (req, res) => {
  try {
    const existingAccount = await Account.findById(req.params.id);

    if (!existingAccount) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    if (req.body.isSalaryAccount === true) {
      await demoteOtherSalaryAccounts(existingAccount.userId, existingAccount._id);
    }

    const account = await Account.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.json({
      success: true,
      data: account,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    await Account.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Account deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
