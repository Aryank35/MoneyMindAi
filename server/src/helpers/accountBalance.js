import Account from "../models/Account.js";

export const deductBalance = async (
  accountId,
  amount
) => {
  const account =
    await Account.findById(accountId);

  if (!account) return;

  account.balance -= Number(amount);

  await account.save();
};

export const addBalance = async (
  accountId,
  amount
) => {
  const account =
    await Account.findById(accountId);

  if (!account) return;

  account.balance += Number(amount);

  await account.save();
};