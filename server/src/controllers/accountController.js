import Account from "../models/Account.js";

export const createAccount = async (
  req,
  res
) => {
  try {
    const account =
      await Account.create(req.body);

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

export const getAccountsByUser =
  async (req, res) => {
    try {
      const accounts =
        await Account.find({
          userId:
            req.params.userId,
        });

      res.json({
        success: true,
        data: accounts,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

export const updateAccount =
  async (req, res) => {
    try {
      const account =
        await Account.findByIdAndUpdate(
          req.params.id,
          req.body,
          {
            new: true,
          }
        );

      res.json({
        success: true,
        data: account,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

export const deleteAccount =
  async (req, res) => {
    try {
      await Account.findByIdAndDelete(
        req.params.id
      );

      res.json({
        success: true,
        message:
          "Account deleted",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };