import Account from "../models/Account.js";
import Plan from "../models/Plan.js";
import Wishlist from "../models/Wishlist.js";

const normalizePlanPayload = (body) => ({
  ...body,
  title: body.title?.trim(),
  description: body.description?.trim() || "",
  category: body.category?.trim() || "Other",
  estimatedAmount: Number(body.estimatedAmount || 0),
  savedAmount: Number(body.savedAmount || 0),
  inflationRate: Number(body.inflationRate || 0),
  notes: body.notes?.trim() || "",
  linkedBudgetCategory: body.linkedBudgetCategory?.trim() || "",
  attachments: Array.isArray(body.attachments)
    ? body.attachments
    : body.attachments
      ? String(body.attachments)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
});

const validatePlan = (body) => {
  if (!body.userId) return "User is required";
  if (!body.title?.trim()) return "Title is required";
  if (Number(body.estimatedAmount || 0) <= 0) {
    return "Estimated amount must be greater than 0";
  }
  if (!body.targetDate) return "Target date is required";
  return null;
};

const syncWishlist = async (plan) => {
  if (!plan.linkedWishlistId) return;

  await Wishlist.findByIdAndUpdate(
    plan.linkedWishlistId,
    {
      itemName: plan.title,
      targetAmount: plan.estimatedAmount,
      savedAmount: plan.savedAmount,
      targetDate: plan.targetDate,
      priority: plan.priority === "Critical" ? "High" : plan.priority,
      description: plan.description,
      linkedAccountId: plan.linkedAccountId,
    },
    {
      new: true,
      runValidators: true,
    },
  );
};

export const createPlan = async (req, res) => {
  try {
    const validationError = validatePlan(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const plan = await Plan.create(normalizePlanPayload(req.body));

    await syncWishlist(plan);

    res.status(201).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPlansByUser = async (req, res) => {
  try {
    const plans = await Plan.find({
      userId: req.params.userId,
    })
      .populate("linkedAccountId", "name type balance")
      .populate("linkedWishlistId", "itemName targetAmount savedAmount")
      .sort({ targetDate: 1 });

    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPlanSummary = async (req, res) => {
  try {
    const plans = await Plan.find({
      userId: req.params.userId,
    }).sort({ targetDate: 1 });
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    const activePlans = plans.filter((plan) => plan.status !== "Cancelled");
    const completedPlans = plans.filter((plan) => plan.status === "Completed");
    const upcomingPlans = activePlans.filter((plan) => plan.status !== "Completed");
    const plansDueThisMonth = upcomingPlans.filter((plan) => {
      const targetDate = new Date(plan.targetDate);
      return targetDate.getMonth() === month && targetDate.getFullYear() === year;
    });
    const priorityRank = {
      Critical: 4,
      High: 3,
      Medium: 2,
      Low: 1,
    };

    const totalPlannedAmount = activePlans.reduce(
      (sum, plan) => sum + Number(plan.estimatedAmount || 0),
      0,
    );
    const totalSaved = activePlans.reduce(
      (sum, plan) => sum + Number(plan.savedAmount || 0),
      0,
    );
    const remainingAmount = activePlans.reduce(
      (sum, plan) => sum + Number(plan.remainingAmount || 0),
      0,
    );

    res.json({
      success: true,
      data: {
        totalPlannedAmount,
        totalSaved,
        remainingAmount,
        upcomingPlans: upcomingPlans.length,
        completedPlans: completedPlans.length,
        averageMonthlySavingRequired: upcomingPlans.length
          ? Math.ceil(
              upcomingPlans.reduce(
                (sum, plan) => sum + Number(plan.monthlySaving || 0),
                0,
              ) / upcomingPlans.length,
            )
          : 0,
        nearestDuePlan: upcomingPlans[0] || null,
        highestPriorityPlan:
          [...upcomingPlans].sort(
            (a, b) =>
              priorityRank[b.priority] - priorityRank[a.priority] ||
              new Date(a.targetDate) - new Date(b.targetDate),
          )[0] || null,
        plansDueThisMonth,
        amountNeededThisMonth: plansDueThisMonth.reduce(
          (sum, plan) => sum + Number(plan.monthlySaving || 0),
          0,
        ),
        recentCompletedPlans: completedPlans.slice(-5).reverse(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updatePlan = async (req, res) => {
  try {
    const existingPlan = await Plan.findById(req.params.id);

    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    const payload = normalizePlanPayload({
      ...existingPlan.toObject(),
      ...req.body,
    });
    const validationError = validatePlan(payload);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    existingPlan.set(payload);
    const plan = await existingPlan.save();

    await syncWishlist(plan);

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const contributeToPlan = async (req, res) => {
  try {
    const { amount, accountId, note } = req.body;
    const contributionAmount = Number(amount || 0);

    if (contributionAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Contribution amount must be greater than 0",
      });
    }

    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    const account = await Account.findById(accountId || plan.linkedAccountId);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    if (Number(account.balance || 0) < contributionAmount) {
      return res.status(400).json({
        success: false,
        message: "Account balance is not enough for this contribution",
      });
    }

    account.balance -= contributionAmount;
    await account.save();

    plan.savedAmount = Number(plan.savedAmount || 0) + contributionAmount;
    plan.contributions.push({
      amount: contributionAmount,
      accountId: account._id,
      note: note?.trim() || "",
      date: new Date(),
    });

    const updatedPlan = await plan.save();

    await syncWishlist(updatedPlan);

    res.json({
      success: true,
      data: updatedPlan,
      account,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const completePlan = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    plan.completed = true;
    plan.savedAmount = Math.max(plan.savedAmount, plan.estimatedAmount);
    plan.status = "Completed";

    const updatedPlan = await plan.save();

    await syncWishlist(updatedPlan);

    res.json({
      success: true,
      data: updatedPlan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    await plan.deleteOne();

    res.json({
      success: true,
      message: "Plan deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
