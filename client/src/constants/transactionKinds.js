// =========================================================================
// TRANSACTION KINDS
//
// Every kind of entry the unified ledger (/accounts/transactions) can return,
// and how to describe it. Shared so the Dashboard feed and the Expenses list
// name the same movement the same way - they used to carry separate copies,
// which is how "Into a pot" could read differently on two pages.
//
// `spend` marks the kinds that are genuinely spending. The rest left the
// account without being spent - funding a pot, lending, moving between your
// own accounts - which is why totals keep the two apart.
// =========================================================================

export const TRANSACTION_KINDS = {
  expense: { label: "Expense", spend: true, tone: "text-red-300" },
  split: { label: "Split share", spend: true, tone: "text-red-300" },
  income: { label: "Income", tone: "text-emerald-300" },
  epf: { label: "EPF", tone: "text-cyan-300" },
  "transfer-in": { label: "Transfer in", tone: "text-emerald-300" },
  "transfer-out": { label: "Transfer out", tone: "text-slate-300" },
  "pot-funding": { label: "Into a pot", tone: "text-indigo-300" },
  "pot-withdrawal": { label: "Out of a pot", tone: "text-indigo-300" },
  lent: { label: "Lent out", tone: "text-amber-300" },
  borrowed: { label: "Borrowed", tone: "text-amber-300" },
  "repayment-in": { label: "Repaid to you", tone: "text-emerald-300" },
  "repayment-out": { label: "You repaid", tone: "text-slate-300" },
  "split-advance": { label: "Advanced on a split", tone: "text-amber-300" },
};

// An unknown kind still has to render: a new ledger entry type should show up
// as itself rather than disappearing from the list.
export const kindMeta = (kind) =>
  TRANSACTION_KINDS[kind] || { label: kind, tone: "text-slate-300" };

export const isSpendKind = (kind) => Boolean(TRANSACTION_KINDS[kind]?.spend);
