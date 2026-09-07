// Shared "how urgent is this" mapping, used by credit-card dues, scheduled
// payments and lending promises alike. One place so the thresholds and
// wording never diverge between them.

export const getDueStatus = (daysUntil, amountOutstanding) => {
  if (!(Number(amountOutstanding) > 0)) {
    return { key: "clear", label: "Nothing due", severity: 0 };
  }

  if (daysUntil === null || daysUntil === undefined) {
    return { key: "undated", label: "No date agreed", severity: 1 };
  }

  if (daysUntil < 0) {
    const late = Math.abs(daysUntil);

    return {
      key: "overdue",
      label: `Overdue by ${late} day${late === 1 ? "" : "s"}`,
      severity: 4,
    };
  }

  if (daysUntil === 0) {
    return { key: "today", label: "Due today", severity: 3 };
  }

  if (daysUntil <= 3) {
    return {
      key: "urgent",
      label: `Due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
      severity: 2,
    };
  }

  if (daysUntil <= 7) {
    return { key: "soon", label: `Due in ${daysUntil} days`, severity: 1 };
  }

  return { key: "scheduled", label: `Due in ${daysUntil} days`, severity: 0 };
};
