import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  FiCalendar,
  FiCheckSquare,
  FiMapPin,
  FiPaperclip,
  FiPlus,
  FiUsers,
} from "react-icons/fi";

import DashboardLayout from "../components/layout/DashboardLayout";
import Modal from "../components/common/Modal";
import Button from "../components/common/Button";
import Input, { Select } from "../components/common/Input";
import AmountInput from "../components/common/AmountInput";
import EmptyState from "../components/common/EmptyState";
import { Skeleton } from "../components/common/Loader";
import { useToast } from "../components/common/Toast";

import {
  getEventOptions,
  getEventsByUser,
  createEvent,
} from "../services/eventService";
import { getUserId } from "../utils/auth";
import { money } from "../utils/incomeFormulas";
import { evaluateExpression } from "../utils/calc";

const toInputDate = (value) => {
  const date = value ? new Date(value) : new Date();

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
};

const formatRange = (start, end) => {
  if (!start) return "No dates yet";

  const options = { day: "numeric", month: "short" };

  const from = new Date(start).toLocaleDateString("en-IN", options);

  if (!end) return from;

  const to = new Date(end).toLocaleDateString("en-IN", {
    ...options,
    year: "numeric",
  });

  return from === to.replace(/ \d{4}$/, "") ? to : `${from} – ${to}`;
};

const STATUS_TONE = {
  planning: "bg-indigo-500/15 text-indigo-200",
  ongoing: "bg-emerald-500/15 text-emerald-200",
  done: "bg-slate-500/15 text-slate-300",
  cancelled: "bg-red-500/15 text-red-200",
};

// A countdown is the single most useful thing on a card for something that
// has not happened yet, and dead weight for something that has.
const countdownLabel = (event) => {
  if (event.status === "cancelled") return "Cancelled";

  if (event.daysUntilStart === null) return "";

  if (event.daysUntilStart > 1) return `in ${event.daysUntilStart} days`;

  if (event.daysUntilStart === 1) return "tomorrow";

  if (event.daysUntilStart === 0) return "today";

  if (event.daysUntilEnd !== null && event.daysUntilEnd >= 0) return "happening";

  return `${Math.abs(event.daysUntilStart)} days ago`;
};

const emptyForm = () => ({
  name: "",
  type: "trip",
  destination: "",
  startDate: toInputDate(),
  endDate: "",
  budgetCap: "",
  seedChecklist: true,
});

export default function Events() {
  const toast = useToast();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [events, setEvents] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [tab, setTab] = useState("upcoming");

  const motionProps = (delay = 0) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay, ease: "easeOut" },
        };

  const load = async () => {
    try {
      const [optionsRes, listRes] = await Promise.all([
        getEventOptions(),
        getEventsByUser(getUserId()),
      ]);

      setTypes(optionsRes.data?.types || []);
      setEvents(listRes.data || []);
    } catch (error) {
      console.error(error);

      toast.error("Could not load your events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(load, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedType = types.find((type) => type.key === form.type);

  const visible = useMemo(() => {
    if (tab === "all") return events;

    if (tab === "upcoming") {
      return events.filter(
        (event) =>
          event.status !== "cancelled" &&
          (event.suggestedStatus === "planning" ||
            event.suggestedStatus === "ongoing"),
      );
    }

    return events.filter(
      (event) =>
        event.suggestedStatus === "done" || event.status === "cancelled",
    );
  }, [events, tab]);

  const totals = useMemo(() => {
    const live = events.filter(
      (event) =>
        event.status !== "cancelled" && event.suggestedStatus !== "done",
    );

    return {
      committed: live.reduce(
        (sum, event) => sum + Number(event.totals?.budgetLine || 0),
        0,
      ),
      spent: live.reduce(
        (sum, event) => sum + Number(event.totals?.actual || 0),
        0,
      ),
      owedToMe: events.reduce(
        (sum, event) => sum + Number(event.totals?.owedToMe || 0),
        0,
      ),
      liveCount: live.length,
    };
  }, [events]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Give this a name");

      return;
    }

    const cap = evaluateExpression(form.budgetCap || "0");

    if (cap.error) {
      toast.error(cap.error);

      return;
    }

    if (form.endDate && form.startDate && form.endDate < form.startDate) {
      toast.error("The end date cannot be before the start date");

      return;
    }

    try {
      setSaving(true);

      const response = await createEvent({
        userId: getUserId(),
        name: form.name,
        type: form.type,
        destination: form.destination,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        budgetCap: cap.value,
        seedChecklist: form.seedChecklist,
      });

      toast.success("Event created");
      setShowModal(false);

      // Straight into the workspace - the list is not where the work happens.
      navigate(`/events/${response.data._id}`);
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.message || "Could not create it");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Skeleton className="mb-6 h-40" />
        <Skeleton className="h-72" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* ============ HEADER ============ */}
      <motion.section
        {...motionProps(0)}
        className="mb-6 rounded-3xl border border-white/10 bg-slate-900 p-6 lg:p-8"
      >
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
              Plans &amp; Occasions
            </p>

            <h1 className="mt-2 text-4xl">
              {money(totals.committed)}
              <span className="ml-2 font-sans text-base text-slate-400">
                budgeted across {totals.liveCount}{" "}
                {totals.liveCount === 1 ? "plan" : "plans"}
              </span>
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Estimate it before, track it during, and see exactly where it
              went after.
            </p>
          </div>

          <Button icon={FiPlus} onClick={() => setShowModal(true)}>
            New plan
          </Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Budgeted", value: totals.committed, tone: "text-white" },
            {
              label: "Spent so far",
              value: totals.spent,
              tone:
                totals.spent > totals.committed
                  ? "text-red-300"
                  : "text-emerald-300",
            },
            {
              label: "Owed back to you",
              value: totals.owedToMe,
              tone: totals.owedToMe > 0 ? "text-amber-300" : "text-slate-300",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <p className="text-xs uppercase tracking-wider text-slate-500">
                {card.label}
              </p>

              <p className={`mt-1 text-2xl font-semibold ${card.tone}`}>
                {money(card.value)}
              </p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ============ FILTER ============ */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {[
          { key: "upcoming", label: "Upcoming & live" },
          { key: "past", label: "Finished" },
          { key: "all", label: "Everything" },
        ].map((option) => (
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
          </button>
        ))}
      </div>

      {/* ============ LIST ============ */}
      {visible.length === 0 ? (
        <EmptyState
          icon={FiCalendar}
          title={
            events.length === 0 ? "Nothing planned yet" : "Nothing in this view"
          }
          message={
            events.length === 0
              ? "Start a trip, a party or anything else you want to budget for and settle up afterwards."
              : "Try another filter."
          }
          action={
            events.length === 0 ? (
              <Button icon={FiPlus} onClick={() => setShowModal(true)}>
                Plan something
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((event, index) => {
            const used = event.totals?.usedPercentage;
            const over = event.totals?.variance > 0;
            const countdown = countdownLabel(event);

            return (
              <motion.button
                key={event._id}
                {...motionProps(Math.min(index, 8) * 0.03)}
                onClick={() => navigate(`/events/${event._id}`)}
                className="group rounded-3xl border border-white/10 bg-slate-900 p-5 text-left transition hover:border-indigo-500/40 hover:bg-slate-900/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="text-3xl leading-none">
                      {event.typeMeta?.icon}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold">
                        {event.name}
                      </p>

                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <FiCalendar size={12} />
                          {formatRange(event.startDate, event.endDate)}
                        </span>

                        {event.destination && (
                          <span className="inline-flex items-center gap-1">
                            <FiMapPin size={12} />
                            {event.destination}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1">
                          <FiUsers size={12} />
                          {event.headcount}
                        </span>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${
                      STATUS_TONE[event.suggestedStatus] || STATUS_TONE.planning
                    }`}
                  >
                    {countdown || event.suggestedStatus}
                  </span>
                </div>

                {/* spend against budget */}
                <div className="mt-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-2xl font-semibold">
                      {money(event.totals?.actual || 0)}
                    </p>

                    <p className="text-xs text-slate-400">
                      of {money(event.totals?.budgetLine || 0)}
                      {event.totals?.budgetCap > 0 ? " cap" : " planned"}
                    </p>
                  </div>

                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all ${
                        over ? "bg-red-400" : "bg-emerald-400"
                      }`}
                      style={{ width: `${Math.min(used || 0, 100)}%` }}
                    />
                  </div>

                  <p className="mt-1.5 text-xs text-slate-500">
                    {event.totals?.budgetLine > 0 ? (
                      over ? (
                        <span className="text-red-300">
                          {money(event.totals.variance)} over
                        </span>
                      ) : (
                        <span className="text-emerald-300">
                          {money(event.totals.remaining)} left
                        </span>
                      )
                    ) : (
                      "No budget set yet"
                    )}

                    <span className="text-slate-600"> · </span>
                    your share {money(event.totals?.myCost || 0)}
                  </p>
                </div>

                {/* chips */}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  {event.taskProgress?.total > 0 && (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 ${
                        event.taskProgress.overdue > 0
                          ? "bg-amber-500/15 text-amber-200"
                          : "bg-white/5 text-slate-300"
                      }`}
                    >
                      <FiCheckSquare size={12} />
                      {event.taskProgress.done}/{event.taskProgress.total} done
                      {event.taskProgress.overdue > 0 &&
                        ` · ${event.taskProgress.overdue} late`}
                    </span>
                  )}

                  {event.totals?.owedToMe > 0 && (
                    <span className="rounded-lg bg-amber-500/15 px-2 py-1 text-amber-200">
                      {money(event.totals.owedToMe)} to collect
                    </span>
                  )}

                  {event.totals?.iOwe > 0 && (
                    <span className="rounded-lg bg-red-500/15 px-2 py-1 text-red-200">
                      {money(event.totals.iOwe)} you owe
                    </span>
                  )}

                  {event.attachmentCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 text-slate-300">
                      <FiPaperclip size={12} />
                      {event.attachmentCount}
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* ============ NEW ============ */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Plan something"
        maxWidth="max-w-2xl"
      >
        <p className="mb-4 text-sm text-slate-400">
          Pick what this is. Each kind comes with its own budget headings and a
          starter checklist, which you can change afterwards.
        </p>

        <div className="mb-5 grid gap-2 sm:grid-cols-2">
          {types.map((type) => (
            <button
              key={type.key}
              type="button"
              onClick={() => setForm({ ...form, type: type.key })}
              className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition ${
                form.type === type.key
                  ? "border-indigo-500/50 bg-indigo-500/10"
                  : "border-white/10 hover:border-white/25"
              }`}
            >
              <span className="text-2xl leading-none">{type.icon}</span>

              <span className="min-w-0">
                <span className="block text-sm font-medium">{type.label}</span>
                <span className="block text-xs text-slate-400">
                  {type.blurb}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="What is it called"
            placeholder="Goa with the college group"
            value={form.name}
            onChange={(event) =>
              setForm({ ...form, name: event.target.value })
            }
          />

          <Input
            label="Where"
            placeholder="Optional"
            value={form.destination}
            onChange={(event) =>
              setForm({ ...form, destination: event.target.value })
            }
          />

          <Input
            label="Starts"
            type="date"
            value={form.startDate}
            onChange={(event) =>
              setForm({ ...form, startDate: event.target.value })
            }
          />

          <Input
            label="Ends"
            type="date"
            value={form.endDate}
            min={form.startDate || undefined}
            onChange={(event) =>
              setForm({ ...form, endDate: event.target.value })
            }
            hint="Leave blank for a single day"
          />

          <AmountInput
            label="Budget cap"
            placeholder="Optional"
            value={form.budgetCap}
            onChange={(event) =>
              setForm({ ...form, budgetCap: event.target.value })
            }
            hint="What you are willing to spend in total"
          />

          <Select
            label="Starter checklist"
            value={form.seedChecklist ? "yes" : "no"}
            onChange={(event) =>
              setForm({ ...form, seedChecklist: event.target.value === "yes" })
            }
          >
            <option value="yes">
              Add the {selectedType?.label?.toLowerCase() || "default"} checklist
            </option>
            <option value="no">Start with an empty checklist</option>
          </Select>
        </div>

        {selectedType?.checklist?.length > 0 && form.seedChecklist && (
          <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-400">
            You will start with: {selectedType.checklist.join(" · ")}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowModal(false)}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button onClick={handleCreate} loading={saving}>
            Create
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
