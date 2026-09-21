import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheckSquare,
  FiClipboard,
  FiCreditCard,
  FiEdit2,
  FiGift,
  FiMapPin,
  FiPlus,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";

import DashboardLayout from "../components/layout/DashboardLayout";
import Modal from "../components/common/Modal";
import Button from "../components/common/Button";
import Input, { Select } from "../components/common/Input";
import AmountInput from "../components/common/AmountInput";
import EmptyState from "../components/common/EmptyState";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { Skeleton } from "../components/common/Loader";
import { useToast } from "../components/common/Toast";

import EventExpenseModal from "../components/events/EventExpenseModal";
import EventPlanTab from "../components/events/EventPlanTab";
import EventTasksTab from "../components/events/EventTasksTab";
import EventBoardTab from "../components/events/EventBoardTab";
import EventPeopleTab from "../components/events/EventPeopleTab";

import {
  getEvent,
  getEventOptions,
  updateEvent,
  getEventDeleteImpact,
  deleteEvent,
  addEventItem,
  updateEventItem,
  removeEventItem,
  seedEventChecklist,
  addEventAttachment,
  getEventAttachment,
  deleteEventAttachment,
} from "../services/eventService";
import {
  createSplit,
  updateSplit,
  settleSplit,
  deleteSplit,
} from "../services/splitService";
import { getUserId } from "../utils/auth";
import { money } from "../utils/incomeFormulas";
import { evaluateExpression } from "../utils/calc";

const toInputDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
};

const formatDay = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "";

const TABS = [
  { key: "overview", label: "Overview", icon: FiClipboard },
  { key: "plan", label: "Budget", icon: FiCreditCard },
  { key: "expenses", label: "Spending", icon: FiCreditCard },
  { key: "tasks", label: "Tasks", icon: FiCheckSquare },
  { key: "people", label: "People", icon: FiUsers },
  { key: "board", label: "Notes & files", icon: FiClipboard },
];

export default function EventDetail() {
  const { id } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [event, setEvent] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  const [showExpense, setShowExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [removingExpense, setRemovingExpense] = useState(null);

  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [deleteImpact, setDeleteImpact] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);

  const motionProps = (delay = 0) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.35, delay, ease: "easeOut" },
        };

  // Every write returns the whole recomputed event, so this is the single
  // place state is replaced - nothing is patched locally and left to drift
  // from what the server actually holds.
  const apply = (payload) => {
    if (!payload) return;

    setEvent((previous) => ({ ...previous, ...payload }));
  };

  const load = async () => {
    try {
      const [detail, optionsRes] = await Promise.all([
        getEvent(id),
        getEventOptions(),
      ]);

      setEvent(detail.data);
      setAttachments(detail.data.attachments || []);
      setAccounts(detail.data.accounts || []);
      setOptions(optionsRes.data || null);
    } catch (error) {
      console.error(error);

      toast.error("Could not open that event");
      navigate("/events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(load, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------------------------------------------------------- list writes --
  const handleAdd = async (collection, item) => {
    const response = await addEventItem(id, collection, item);

    apply(response.data);
  };

  const handleUpdate = async (collection, itemId, patch) => {
    const response = await updateEventItem(id, collection, itemId, patch);

    apply(response.data);
  };

  const handleRemove = async (collection, itemId) => {
    const response = await removeEventItem(id, collection, itemId);

    apply(response.data);
  };

  const handleSeedChecklist = async () => {
    try {
      const response = await seedEventChecklist(id);

      apply(response.data);

      toast.success(
        response.added > 0
          ? `${response.added} tasks added`
          : "Everything on that checklist is already here",
      );
    } catch (error) {
      console.error(error);

      toast.error("Could not add the checklist");
    }
  };

  // ------------------------------------------------------- expense writes --
  const saveExpense = async (payload) => {
    const body = { ...payload, userId: getUserId(), eventId: id };

    if (editingExpense) {
      await updateSplit(editingExpense._id, body);
    } else {
      // The event's name rides along as the group label, so these bills are
      // recognisable on the Splits page too rather than looking orphaned.
      await createSplit({ ...body, groupName: event.name });
    }

    await load();

    toast.success(editingExpense ? "Expense updated" : "Expense added");
  };

  const confirmRemoveExpense = async () => {
    try {
      setBusy(true);

      await deleteSplit(removingExpense._id);
      setRemovingExpense(null);

      await load();

      toast.success("Expense removed and the money put back");
    } catch (error) {
      console.error(error);

      toast.error("Could not remove that expense");
    } finally {
      setBusy(false);
    }
  };

  const handleSettle = async (splitId, body) => {
    await settleSplit(splitId, body);

    await load();
  };

  // ---------------------------------------------------------- attachments --
  const handleUpload = async (payload) => {
    const response = await addEventAttachment(id, payload);

    setAttachments((previous) => [response.data, ...previous]);
  };

  const handleOpenAttachment = async (attachmentId) => {
    const response = await getEventAttachment(attachmentId);

    return response.data;
  };

  const handleDeleteAttachment = async (attachmentId) => {
    await deleteEventAttachment(attachmentId);

    setAttachments((previous) =>
      previous.filter((item) => item._id !== attachmentId),
    );
  };

  // ------------------------------------------------------------- settings --
  const openSettings = () => {
    setSettings({
      name: event.name,
      destination: event.destination || "",
      startDate: toInputDate(event.startDate),
      endDate: toInputDate(event.endDate),
      budgetCap: event.totals.budgetCap ? String(event.totals.budgetCap) : "",
      status: event.status,
      emoji: event.emoji || "",
      note: event.note || "",
    });

    setShowSettings(true);
  };

  const saveSettings = async () => {
    if (!settings.name.trim()) {
      toast.error("Give this a name");

      return;
    }

    const cap = evaluateExpression(settings.budgetCap || "0");

    if (cap.error) {
      toast.error(cap.error);

      return;
    }

    try {
      setSavingSettings(true);

      const response = await updateEvent(id, {
        name: settings.name,
        destination: settings.destination,
        startDate: settings.startDate || null,
        endDate: settings.endDate || null,
        budgetCap: cap.value,
        status: settings.status,
        emoji: settings.emoji,
        note: settings.note,
      });

      apply(response.data);
      setShowSettings(false);

      toast.success("Saved");
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.message || "Could not save");
    } finally {
      setSavingSettings(false);
    }
  };

  const requestDelete = async () => {
    try {
      const response = await getEventDeleteImpact(id);

      setDeleteImpact(response.data);
    } catch (error) {
      console.error(error);

      toast.error("Could not check what this would affect");
    }
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);

      await deleteEvent(id);

      toast.success("Event removed");
      navigate("/events");
    } catch (error) {
      console.error(error);

      toast.error("Could not remove it");
    } finally {
      setDeleting(false);
    }
  };

  // ---------------------------------------------------------------- render --
  const expenses = useMemo(
    () =>
      [...(event?.expenses || [])].sort(
        (a, b) => new Date(b.date) - new Date(a.date),
      ),
    [event],
  );

  if (loading || !event) {
    return (
      <DashboardLayout>
        <Skeleton className="mb-6 h-48" />
        <Skeleton className="h-72" />
      </DashboardLayout>
    );
  }

  const totals = event.totals;
  const over = totals.variance > 0;

  return (
    <DashboardLayout>
      <button
        onClick={() => navigate("/events")}
        className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
      >
        <FiArrowLeft size={15} />
        All plans
      </button>

      {/* ============ HEADER ============ */}
      <motion.section
        {...motionProps(0)}
        className="mb-6 rounded-3xl border border-white/10 bg-slate-900 p-6 lg:p-8"
      >
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="flex min-w-0 items-start gap-4">
            <span className="text-4xl leading-none">{event.typeMeta.icon}</span>

            <div className="min-w-0">
              <h1 className="break-words text-3xl">{event.name}</h1>

              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <FiCalendar size={13} />
                  {event.startDate
                    ? `${formatDay(event.startDate)}${
                        event.endDate ? ` – ${formatDay(event.endDate)}` : ""
                      }`
                    : "No dates"}
                  {event.durationDays > 1 && ` · ${event.durationDays} days`}
                </span>

                {event.destination && (
                  <span className="inline-flex items-center gap-1.5">
                    <FiMapPin size={13} />
                    {event.destination}
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5">
                  <FiUsers size={13} />
                  {event.headcount} people
                </span>
              </p>

              {event.daysUntilStart !== null &&
                event.daysUntilStart > 0 &&
                event.status !== "cancelled" && (
                  <p className="mt-2 inline-block rounded-full bg-indigo-500/15 px-3 py-1 text-sm text-indigo-200">
                    {event.daysUntilStart === 1
                      ? "Tomorrow"
                      : `${event.daysUntilStart} days to go`}
                  </p>
                )}

              {event.status === "cancelled" && (
                <p className="mt-2 inline-block rounded-full bg-red-500/15 px-3 py-1 text-sm text-red-200">
                  Cancelled
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={FiEdit2}
              onClick={openSettings}
            >
              Edit
            </Button>

            <Button
              variant="ghost"
              size="sm"
              icon={FiTrash2}
              onClick={requestDelete}
            >
              Delete
            </Button>

            <Button
              icon={FiPlus}
              onClick={() => {
                setEditingExpense(null);
                setShowExpense(true);
              }}
            >
              Add expense
            </Button>
          </div>
        </div>

        {/* the one comparison the whole feature exists for */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Spent so far
              </p>

              <p className="mt-1 text-4xl">{money(totals.actual)}</p>

              <p className="mt-1 text-sm text-slate-400">
                against {money(totals.budgetLine)}{" "}
                {totals.budgetCap > 0 ? "budgeted" : "estimated"}
              </p>
            </div>

            <div className="text-right">
              <p
                className={`text-2xl font-semibold ${
                  over ? "text-red-300" : "text-emerald-300"
                }`}
              >
                {money(Math.abs(over ? totals.variance : totals.remaining))}
              </p>

              <p className="text-sm text-slate-400">
                {totals.budgetLine === 0
                  ? "no budget set"
                  : over
                    ? "over budget"
                    : "still left"}
              </p>
            </div>
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                over ? "bg-red-400" : "bg-emerald-400"
              }`}
              style={{ width: `${Math.min(totals.usedPercentage || 0, 100)}%` }}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {[
              {
                label: "Your share",
                value: totals.myCost,
                hint: "what it actually cost you",
              },
              {
                label: "You fronted",
                value: totals.advanced,
                hint: "paid for others",
              },
              {
                label: "To collect",
                value: totals.owedToMe,
                hint: "still owed to you",
              },
              {
                label: "You owe",
                value: totals.iOwe,
                hint: "to whoever paid",
              },
            ].map((card) => (
              <div key={card.label}>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  {card.label}
                </p>

                <p className="mt-0.5 text-xl font-semibold">
                  {money(card.value)}
                </p>

                <p className="text-xs text-slate-500">{card.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ============ TABS ============ */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((option) => {
          const count =
            option.key === "expenses"
              ? totals.expenseCount
              : option.key === "tasks"
                ? event.taskProgress.total
                : option.key === "people"
                  ? event.headcount
                  : option.key === "board"
                    ? event.counts.notes +
                      event.counts.links +
                      attachments.length
                    : option.key === "plan"
                      ? event.planItems.length
                      : 0;

          return (
            <button
              key={option.key}
              onClick={() => setTab(option.key)}
              className={`whitespace-nowrap rounded-xl border px-4 py-2 text-sm transition ${
                tab === option.key
                  ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-100"
                  : "border-white/10 text-slate-400 hover:border-white/25 hover:text-white"
              }`}
            >
              {option.label}

              {count > 0 && (
                <span className="ml-2 rounded-md bg-white/10 px-1.5 py-0.5 text-xs">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <motion.div {...motionProps(0.05)}>
        {/* ---------------- OVERVIEW ---------------- */}
        {tab === "overview" && (
          <div className="space-y-6">
            {event.taskProgress.total > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium">
                    {event.taskProgress.done} of {event.taskProgress.total}{" "}
                    tasks done
                    {event.taskProgress.overdue > 0 && (
                      <span className="ml-2 text-amber-300">
                        · {event.taskProgress.overdue} past its date
                      </span>
                    )}
                  </p>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setTab("tasks")}
                  >
                    Open the list
                  </Button>
                </div>

                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                    style={{ width: `${event.taskProgress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* biggest heads */}
            {event.categories.length > 0 ? (
              <div>
                <h3 className="mb-3 font-semibold">Where the money went</h3>

                <div className="space-y-2">
                  {event.categories.slice(0, 6).map((row) => (
                    <div
                      key={row.category}
                      className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{row.category}</p>

                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full ${
                              row.variance > 0 ? "bg-red-400" : "bg-emerald-400"
                            }`}
                            style={{
                              width: `${Math.min(
                                totals.actual > 0
                                  ? (row.actual / totals.actual) * 100
                                  : 0,
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold tabular-nums">
                          {money(row.actual)}
                        </p>

                        {row.estimated > 0 && (
                          <p
                            className={`text-xs ${
                              row.variance > 0
                                ? "text-red-300"
                                : "text-emerald-300"
                            }`}
                          >
                            {row.variance > 0 ? "+" : ""}
                            {money(row.variance)} vs plan
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={FiCreditCard}
                title="Nothing spent yet"
                message="Put your estimate together first, then log what you actually pay as it happens."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button size="sm" onClick={() => setTab("plan")}>
                      Build the budget
                    </Button>

                    <Button
                      size="sm"
                      variant="secondary"
                      icon={FiPlus}
                      onClick={() => {
                        setEditingExpense(null);
                        setShowExpense(true);
                      }}
                    >
                      Add an expense
                    </Button>
                  </div>
                }
              />
            )}

            {/* who is owed */}
            {event.ledger.some(
              (person) => person.owesMe > 0 || person.iOwe > 0,
            ) && (
              <div>
                <h3 className="mb-3 font-semibold">Still to settle</h3>

                <div className="grid gap-2 md:grid-cols-2">
                  {event.ledger
                    .filter((person) => person.owesMe > 0 || person.iOwe > 0)
                    .map((person) => (
                      <button
                        key={person.name}
                        onClick={() => setTab("people")}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-left transition hover:border-indigo-500/40"
                      >
                        <span className="truncate">{person.name}</span>

                        <span
                          className={`shrink-0 font-semibold ${
                            person.owesMe > 0 ? "text-amber-300" : "text-red-300"
                          }`}
                        >
                          {money(person.owesMe > 0 ? person.owesMe : person.iOwe)}
                          <span className="ml-1 text-xs font-normal text-slate-500">
                            {person.owesMe > 0 ? "owes you" : "you owe"}
                          </span>
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {event.note && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  About this
                </p>

                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
                  {event.note}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ---------------- BUDGET ---------------- */}
        {tab === "plan" && (
          <EventPlanTab
            event={event}
            onAdd={handleAdd}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
          />
        )}

        {/* ---------------- SPENDING ---------------- */}
        {tab === "expenses" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Every expense</h3>

                <p className="text-sm text-slate-400">
                  Each one moves a real account. Only your own share counts as
                  spending — the rest is tracked as owed.
                </p>
              </div>

              <Button
                size="sm"
                icon={FiPlus}
                onClick={() => {
                  setEditingExpense(null);
                  setShowExpense(true);
                }}
              >
                Add
              </Button>
            </div>

            {expenses.length === 0 ? (
              <EmptyState
                icon={FiCreditCard}
                title="Nothing logged yet"
                message="Add what you pay as you go — fuel, the hotel, dinner. Split it, or mark it as on you."
              />
            ) : (
              expenses.map((expense) => {
                const account = accounts.find(
                  (item) => String(item._id) === String(expense.accountId),
                );

                return (
                  <div
                    key={expense._id}
                    className={`rounded-2xl border p-4 ${
                      expense.isFullySettled
                        ? "border-white/5 bg-white/[0.01]"
                        : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-semibold">
                          <span className="break-words">
                            {expense.description}
                          </span>

                          {expense.category && (
                            <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-normal text-slate-400">
                              {expense.category}
                            </span>
                          )}

                          {expense.treatedAmount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-normal text-amber-200">
                              <FiGift size={10} />
                              {money(expense.treatedAmount)} on you
                            </span>
                          )}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatDay(expense.date)} ·{" "}
                          {expense.paidByMe
                            ? `you paid${account ? ` from ${account.name}` : ""}`
                            : `${expense.payerName} paid`}{" "}
                          · {expense.participants.length} people
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-semibold tabular-nums">
                          {money(expense.totalAmount)}
                        </p>

                        <p className="text-xs text-slate-500">
                          your share {money(expense.myCost)}
                        </p>
                      </div>
                    </div>

                    {/* per-person chips */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {expense.participants.map((person) => {
                        const outstanding =
                          Number(person.share || 0) -
                          Number(person.settledAmount || 0);

                        const gifted = person.recoverable === false;

                        return (
                          <span
                            key={person.name}
                            className={`rounded-lg px-2 py-1 text-xs ${
                              person.isMe
                                ? "bg-indigo-500/15 text-indigo-200"
                                : gifted
                                  ? "bg-amber-500/10 text-amber-200"
                                  : outstanding > 0
                                    ? "bg-white/5 text-slate-300"
                                    : "bg-emerald-500/10 text-emerald-200"
                            }`}
                          >
                            {person.name} {money(person.share)}
                            {!person.isMe &&
                              (gifted
                                ? " · on you"
                                : outstanding <= 0
                                  ? " · settled"
                                  : "")}
                          </span>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      {expense.owedToMe > 0 && (
                        <span className="text-amber-300">
                          {money(expense.owedToMe)} still to come back
                        </span>
                      )}

                      {expense.iOwe > 0 && (
                        <span className="text-red-300">
                          you owe {money(expense.iOwe)}
                        </span>
                      )}

                      <button
                        onClick={() => {
                          setEditingExpense(expense);
                          setShowExpense(true);
                        }}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-slate-300 transition hover:border-white/25 hover:text-white"
                      >
                        <FiEdit2 size={12} />
                        Edit
                      </button>

                      <button
                        onClick={() => setRemovingExpense(expense)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-2.5 py-1.5 text-red-300 transition hover:border-red-500/40"
                      >
                        <FiTrash2 size={12} />
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ---------------- TASKS ---------------- */}
        {tab === "tasks" && (
          <EventTasksTab
            event={event}
            onAdd={handleAdd}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
            onSeedChecklist={handleSeedChecklist}
          />
        )}

        {/* ---------------- PEOPLE ---------------- */}
        {tab === "people" && (
          <EventPeopleTab
            event={event}
            accounts={accounts}
            onAdd={handleAdd}
            onRemove={handleRemove}
            onSettle={handleSettle}
          />
        )}

        {/* ---------------- BOARD ---------------- */}
        {tab === "board" && (
          <EventBoardTab
            event={event}
            attachments={attachments}
            onAdd={handleAdd}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
            onUploadAttachment={handleUpload}
            onDeleteAttachment={handleDeleteAttachment}
            onOpenAttachment={handleOpenAttachment}
            maxAttachmentBytes={options?.maxAttachmentBytes || 3 * 1024 * 1024}
          />
        )}
      </motion.div>

      {/* ============ MODALS ============ */}
      <EventExpenseModal
        isOpen={showExpense}
        onClose={() => {
          setShowExpense(false);
          setEditingExpense(null);
        }}
        onSave={saveExpense}
        event={event}
        accounts={accounts}
        editing={editingExpense}
      />

      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Event settings"
        maxWidth="max-w-2xl"
      >
        {settings && (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Name"
                value={settings.name}
                onChange={(e) =>
                  setSettings({ ...settings, name: e.target.value })
                }
              />

              <Input
                label="Where"
                value={settings.destination}
                onChange={(e) =>
                  setSettings({ ...settings, destination: e.target.value })
                }
              />

              <Input
                label="Starts"
                type="date"
                value={settings.startDate}
                onChange={(e) =>
                  setSettings({ ...settings, startDate: e.target.value })
                }
              />

              <Input
                label="Ends"
                type="date"
                value={settings.endDate}
                min={settings.startDate || undefined}
                onChange={(e) =>
                  setSettings({ ...settings, endDate: e.target.value })
                }
              />

              <AmountInput
                label="Budget cap"
                value={settings.budgetCap}
                onChange={(e) =>
                  setSettings({ ...settings, budgetCap: e.target.value })
                }
                hint="Leave at 0 to compare against your itemised plan instead"
              />

              <Select
                label="Status"
                value={settings.status}
                onChange={(e) =>
                  setSettings({ ...settings, status: e.target.value })
                }
              >
                {(options?.statuses || []).map((status) => (
                  <option key={status.key} value={status.key}>
                    {status.label}
                  </option>
                ))}
              </Select>

              <Input
                label="Icon"
                placeholder={event.typeMeta.icon}
                value={settings.emoji}
                onChange={(e) =>
                  setSettings({ ...settings, emoji: e.target.value })
                }
                hint="Any emoji, or leave blank"
              />
            </div>

            <div className="mt-3 flex flex-col gap-1.5">
              <label htmlFor="event-note" className="text-sm text-slate-400">
                About this
              </label>

              <textarea
                id="event-note"
                rows={3}
                value={settings.note}
                onChange={(e) =>
                  setSettings({ ...settings, note: e.target.value })
                }
                className="w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-3 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowSettings(false)}
                disabled={savingSettings}
              >
                Cancel
              </Button>

              <Button onClick={saveSettings} loading={savingSettings}>
                Save
              </Button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!removingExpense}
        onClose={() => setRemovingExpense(null)}
        onConfirm={confirmRemoveExpense}
        loading={busy}
        title="Remove this expense?"
        message={
          removingExpense
            ? `"${removingExpense.description}" of ${money(removingExpense.totalAmount)} will be deleted, the money put back into your account, and anything already settled against it reversed.`
            : ""
        }
        confirmLabel="Remove"
      />

      <ConfirmDialog
        isOpen={!!deleteImpact}
        onClose={() => setDeleteImpact(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title={`Delete ${deleteImpact?.name || "this event"}?`}
        message={
          deleteImpact
            ? deleteImpact.expenseCount > 0
              ? `This removes ${deleteImpact.expenseCount} expense${
                  deleteImpact.expenseCount === 1 ? "" : "s"
                } totalling ${money(deleteImpact.actual)}, puts ${money(
                  deleteImpact.refundable,
                )} back into your accounts, and drops ${deleteImpact.taskCount} tasks, ${deleteImpact.noteCount} notes and ${deleteImpact.attachmentCount} files. It cannot be undone.`
              : `This drops ${deleteImpact.taskCount} tasks, ${deleteImpact.noteCount} notes, ${deleteImpact.linkCount} links and ${deleteImpact.attachmentCount} files. Nothing has been spent against it.`
            : ""
        }
        confirmLabel="Delete it"
      />
    </DashboardLayout>
  );
}
