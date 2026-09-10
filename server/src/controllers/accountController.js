import Account from "../models/Account.js";
import Income from "../models/Income.js";
import Expense from "../models/Expense.js";

const ROLES = {
  isSalaryAccount: "salary account",
  isEpfAccount: "EPF account",
};

// The account currently holding a role, ignoring the one being edited.
const findRoleHolder = (userId, flag, exceptId) => {
  const filter = {
    userId,
    [flag]: true,
  };

  if (exceptId) {
    filter._id = { $ne: exceptId };
  }

  return Account.findOne(filter);
};

// Salary and EPF are exclusive roles, and they are released deliberately
// rather than stolen. The UI disables the option once a role is held; this
// makes the same rule true for the API, so a stale page or a direct call
// can't quietly re-point salary at a different account.
const findRoleConflict = async (userId, body, exceptId) => {
  if (!userId) return null;

  for (const [flag, label] of Object.entries(ROLES)) {
    if (body[flag] !== true) continue;

    const holder = await findRoleHolder(userId, flag, exceptId);

    if (holder) {
      return {
        status: 409,
        message: `${holder.name} is already your ${label}. Remove the role from it first, then set it here.`,
      };
    }
  }

  return null;
};

export const createAccount = async (req, res) => {
  try {
    const { userId, type } = req.body;

    // A user's very first bank account becomes the salary account so income
    // has somewhere to land without extra setup. Anyone who already has
    // accounts picks their own from the Accounts page instead - silently
    // re-pointing salary at a newly added account would be worse.
    const hasAccounts = await Account.exists({ userId });

    const conflict = await findRoleConflict(userId, req.body);

    if (conflict) {
      return res.status(conflict.status).json({
        success: false,
        message: conflict.message,
      });
    }

    const isSalaryAccount =
      req.body.isSalaryAccount === true ||
      (!hasAccounts && (type || "Bank") === "Bank");

    // An account of type EPF is what it says on the tin - claim the role,
    // but only while it is going spare.
    const hasEpfAccount = await Account.exists({
      userId,
      isEpfAccount: true,
    });

    const isEpfAccount =
      req.body.isEpfAccount === true || (!hasEpfAccount && type === "EPF");

    // Appended rather than inserted, so adding an account never reshuffles
    // the order the user set.
    const last = await Account.findOne({ userId }).sort({ displayOrder: -1 });

    const account = await Account.create({
      ...req.body,
      isSalaryAccount,
      isEpfAccount,
      displayOrder: (last?.displayOrder ?? -1) + 1,
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
    // The user's own order comes first. Roles no longer force the salary or
    // EPF account to the top - they are still badged, but where they sit is
    // now the user's call. createdAt breaks ties so a newly added account
    // lands at the end rather than jumping around.
    const accounts = await Account.find({
      userId: req.params.userId,
    }).sort({
      displayOrder: 1,
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

    const conflict = await findRoleConflict(
      existingAccount.userId,
      req.body,
      existingAccount._id,
    );

    if (conflict) {
      return res.status(conflict.status).json({
        success: false,
        message: conflict.message,
      });
    }

    const update = { ...req.body };

    // Correcting the opening outstanding must not throw away the spends and
    // payments booked since it was set, so the balance moves by the change
    // rather than being rewritten from it. Debt is stored negative, hence the
    // sign flip: raising the opening debt pushes the balance further down.
    const nextOutstanding = req.body.card?.openingOutstanding;

    if (
      existingAccount.type === "Credit Card" &&
      nextOutstanding !== undefined &&
      req.body.balance === undefined
    ) {
      const previous = Math.abs(
        Number(existingAccount.card?.openingOutstanding || 0),
      );

      const next = Math.abs(Number(nextOutstanding || 0));

      if (previous !== next) {
        update.balance = Number(existingAccount.balance || 0) + previous - next;
      }
    }

    const account = await Account.findByIdAndUpdate(req.params.id, update, {
      returnDocument: "after",
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

// Deleting an account leaves any income booked against it orphaned, so the
// confirmation needs to say how much is at stake before it happens.
export const getAccountDeleteImpact = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const [incomeCount, incomeTotal, expenseCount] = await Promise.all([
      Income.countDocuments({ accountId: account._id }),
      Income.aggregate([
        { $match: { accountId: account._id } },
        { $group: { _id: null, total: { $sum: "$creditedAmount" } } },
      ]),
      Expense.countDocuments({ accountId: account._id }),
    ]);

    res.json({
      success: true,
      data: {
        name: account.name,
        balance: account.balance,
        isSalaryAccount: account.isSalaryAccount,
        isEpfAccount: account.isEpfAccount,
        incomeCount,
        incomeTotal: incomeTotal[0]?.total || 0,
        expenseCount,
        // Linked records are not deleted with the account - they are left
        // pointing at an account that no longer exists.
        hasLinkedRecords: incomeCount > 0 || expenseCount > 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Applies a user-chosen order. Takes the ids in their new sequence and
// writes each one's position, in a single round trip.
export const reorderAccounts = async (req, res) => {
  try {
    const { userId, order } = req.body;

    if (!Array.isArray(order) || order.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Send the account ids in their new order" });
    }

    const owned = await Account.find({ userId })
      .select("_id")
      .sort({ displayOrder: 1, createdAt: 1 });

    const ownedIds = new Set(owned.map((account) => String(account._id)));

    // Reordering must never be a way to touch someone else's account.
    const foreign = order.filter((id) => !ownedIds.has(String(id)));

    if (foreign.length > 0) {
      return res
        .status(403)
        .json({ success: false, message: "That account does not belong to this user" });
    }

    // The client sends the whole list, but a partial one has to behave
    // sensibly too: anything not named keeps its relative order and follows
    // the named ones. Without this, unnamed accounts kept their old
    // positions and interleaved with the new ones.
    const listed = order.map((id) => String(id));

    const sequence = [
      ...listed,
      ...owned
        .map((account) => String(account._id))
        .filter((id) => !listed.includes(id)),
    ];

    await Account.bulkWrite(
      sequence.map((id, index) => ({
        updateOne: {
          filter: { _id: id, userId },
          update: { $set: { displayOrder: index } },
        },
      })),
    );

    const accounts = await Account.find({ userId }).sort({
      displayOrder: 1,
      createdAt: 1,
    });

    res.json({ success: true, data: accounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
