import Income from "../models/Income.js";

const validateIncome = ({ source, amount }) => {
  if (!source?.trim()) {
    return "Source is required";
  }

  if (Number(amount) <= 0) {
    return "Amount must be greater than 0";
  }

  return null;
};

export const createIncome = async (req, res) => {
  try {
    const income = await Income.create(req.body);

    res.status(201).json({
      success: true,
      data: income,
    });
  } catch (error) {
    console.error("Income Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getIncomeByUser = async (req, res) => {
  try {
    const incomes = await Income.find({
      userId: req.params.userId,
    }).sort({
      incomeDate: -1,
    });

    res.json({
      success: true,
      data: incomes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateIncome = async (req, res) => {
  try {
    const { source, amount } = req.body;

    const validationError = validateIncome({
      source,
      amount,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const updatedIncome = await Income.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        source: source.trim(),
        amount: Number(amount),
        note: req.body.note?.trim() || "",
      },
      {
        new: true,
      }
    );

    res.json({
      success: true,
      data: updatedIncome,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteIncome = async (req, res) => {
  try {
    await Income.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Income deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};