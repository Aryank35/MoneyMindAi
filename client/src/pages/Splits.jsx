import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  FiAlertTriangle,
  FiArrowDownLeft,
  FiArrowUpRight,
  FiCheck,
  FiPlus,
  FiTrash2,
  FiUserPlus,
  FiUsers,
  FiX,
} from "react-icons/fi";

import DashboardLayout from "../components/layout/DashboardLayout";
import Modal from "../components/common/Modal";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Button from "../components/common/Button";
import Input, { Select } from "../components/common/Input";
import EmptyState from "../components/common/EmptyState";
import { Skeleton } from "../components/common/Loader";
import { useToast } from "../components/common/Toast";

import {
  getSplitOptions,
  getSplitOverview,
  createSplit,
  settleSplit,
  getSplitDeleteImpact,
  deleteSplit,
} from "../services/splitService";
import { getAccountsByUser } from "../services/accountService";
import { getUserId } from "../utils/auth";
import { money } from "../utils/incomeFormulas";

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

const toInputDate = (value) => {
  const date = value ? new Date(value) : new Date();

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

const emptyForm = () => ({
  description: "",
  totalAmount: "",
  date: toInputDate(),
  category: "",
  groupName: "",
  paidByMe: true,
  payerName: "",
  accountId: "",
  splitMethod: "equal",
  participants: [
    { name: "Me", isMe: true, shareInput: "" },
    { name: "", isMe: false, shareInput: "" },
  ],
  note: "",
});

// Mirrors computeShares on the server so the form can show each person's
// amount as it is typed. The server recomputes on save and its answer wins.
const previewShares = (total, method, participants) => {
  const amount = Number(total || 0);
  const people = participants || [];

  if (people.length === 0) return [];

  let shares;

  if (method === "exact") {
    shares = people.map((p) => round2(p.shareInput));
  } else if (method === "percentage") {
    shares = people.map((p) => round2((amount * Number(p.shareInput || 0)) / 100));
  } else if (method === "shares") {
    const weights = people.map((p) => Math.max(Number(p.shareInput || 0), 0));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    shares = totalWeight
      ? weights.map((w) => round2((amount * w) / totalWeight))
      : people.map(() => 0);
  } else {
    const even = round2(amount / people.length);

    shares = people.map(() => even);
  }

  if (method !== "exact") {
    const drift = round2(amount - shares.reduce((sum, s) => sum + s, 0));

    if (drift !== 0) shares[0] = round2(shares[0] + drift);
  }

  return shares.map((value) => Math.max(value, 0));
};

export default function Splits() {
  const toast = useToast();
  const shouldReduceMotion = useReducedMotion();

  const [options, setOptions] = useState(null);
  const [overview, setOverview] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [settleTarget, setSettleTarget] = useState(null);
  const [settleForm, setSettleForm] = useState({
    participantName: "",
    amount: "",
    accountId: "",
  });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteImpact, setDeleteImpact] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [tab, setTab] = useState("open");

  const motionProps = (delay = 0) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay, ease: "easeOut" },
        };

  const loadPage = async () => {
    try {
      const userId = getUserId();

      const [optionsRes, overviewRes, accountsRes] = await Promise.all([
        getSplitOptions(),
        getSplitOverview(userId),
        getAccountsByUser(userId),
      ]);

      setOptions(optionsRes.data || null);
      setOverview(overviewRes.data || null);
      setAccounts(accountsRes.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load splits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(loadPage, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = overview?.totals || {
    count: 0,
    owedToMe: 0,
    iOwe: 0,
    net: 0,
    open: 0,
    myShareTotal: 0,
    billedTotal: 0,
  };

  const splits = overview?.splits || [];

  const visible = splits.filter((split) =>
    tab === "open" ? !split.isFullySettled : tab === "all" ? true : split.isFullySettled,
  );

  const shares = useMemo(
    () => previewShares(form.totalAmount, form.splitMethod, form.participants),
    [form.totalAmount, form.splitMethod, form.participants],
  );

  const myPreviewShare = shares[form.participants.findIndex((p) => p.isMe)] || 0;
  const shareSum = round2(shares.reduce((sum, value) => sum + value, 0));
  const billTotal = round2(form.totalAmount);
  const sharesMatch = shareSum === billTotal;

  // =====================================================================
  // FORM
  // =====================================================================

  const openAdd = () => {
    setForm({ ...emptyForm(), accountId: accounts[0]?._id || "" });
    setShowModal(true);
  };

  const setParticipant = (index, patch) =>
    setForm((prev) => ({
      ...prev,
      participants: prev.participants.map((p, i) =>
        i === index ? { ...p, ...patch } : p,
      ),
    }));

  const addParticipant = () =>
    setForm((prev) => ({
      ...prev,
      participants: [...prev.participants, { name: "", isMe: false, shareInput: "" }],
    }));

  const removeParticipant = (index) =>
    setForm((prev) => ({
      ...prev,
      participants: prev.participants.filter((_, i) => i !== index),
    }));

  const handleSave = async () => {
    if (!form.description.trim()) {
      toast.error("Give this a description");
      return;
    }

    if (!(Number(form.totalAmount) > 0)) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (form.participants.some((p) => !p.name.trim())) {
      toast.error("Every person needs a name");
      return;
    }

    if (form.paidByMe && !form.accountId) {
      toast.error("Which account did you pay from?");
      return;
    }

    if (!form.paidByMe && !form.payerName.trim()) {
      toast.error("Who paid the bill?");
      return;
    }

    try {
      setSaving(true);

      await createSplit({
        userId: getUserId(),
        description: form.description,
        totalAmount: Number(form.totalAmount),
        date: form.date,
        category: form.category,
        groupName: form.groupName,
        paidByMe: form.paidByMe,
        payerName: form.payerName,
        accountId: form.paidByMe ? form.accountId : null,
        splitMethod: form.splitMethod,
        participants: form.participants.map((p) => ({
          name: p.name,
          isMe: p.isMe,
          shareInput: Number(p.shareInput || 0),
        })),
        note: form.note,
      });

      toast.success(
        form.paidByMe
          ? `Split recorded — ${money(myPreviewShare)} booked as your expense`
          : "Split recorded — settle your share when you pay it",
      );

      setShowModal(false);
      await loadPage();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to save split");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================================
  // SETTLE
  // =====================================================================

  const openSettle = (split, participant) => {
    const outstanding = round2(
      Number(participant.share || 0) - Number(participant.settledAmount || 0),
    );

    setSettleTarget({ split, participant, outstanding });
    setSettleForm({
      participantName: participant.name,
      amount: String(outstanding),
      accountId: split.accountId || accounts[0]?._id || "",
    });
  };

  const handleSettle = async () => {
    const amount = Number(settleForm.amount);

    if (!(amount > 0)) {
      toast.error("Enter an amount greater than 0");
      return;
    }

    try {
      setSaving(true);

      await settleSplit(settleTarget.split._id, {
        participantName: settleForm.participantName,
        amount,
        accountId: settleForm.accountId || null,
      });

      toast.success(
        settleTarget.split.paidByMe
          ? `${money(amount)} received from ${settleForm.participantName}`
          : `${money(amount)} paid — booked as your expense`,
      );

      setSettleTarget(null);
      await loadPage();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Could not record it");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================================
  // DELETE
  // =====================================================================

  const requestDelete = async (split) => {
    setDeleteTarget(split);
    setDeleteImpact(null);

    try {
      const response = await getSplitDeleteImpact(split._id);

      setDeleteImpact(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);

      const response = await deleteSplit(deleteTarget._id);

      toast.success(
        response.refunded
          ? `Split removed — ${money(Math.abs(response.refunded))} put back`
          : "Split removed",
      );

      setDeleteTarget(null);
      setDeleteImpact(null);
      await loadPage();
    } catch (error) {
      console.error(error);
      toast.error("Could not remove the split");
    } finally {
      setDeleting(false);
    }
  };

  const deleteMessage = () => {
    if (!deleteTarget) return "";

    if (!deleteImpact) {
      return `This removes "${deleteTarget.description}". This cannot be undone.`;
    }

    const parts = [`This removes "${deleteImpact.description}" of ${money(deleteImpact.totalAmount)}.`];

    if (deleteImpact.paidByMe) {
      parts.push(
        `Your ${money(deleteImpact.myShare)} expense and the ${money(deleteImpact.advanceAmount)} advanced for others are both put back into your account.`,
      );
    }

    if (deleteImpact.settledTotal > 0) {
      parts.push(
        `The ${money(deleteImpact.settledTotal)} already settled is reversed too.`,
      );
    }

    parts.push("This cannot be undone.");

    return parts.join(" ");
  };

  // =====================================================================
  // RENDER
  // =====================================================================

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
              Shared Bills
            </p>
            <h1 className="mt-2 text-4xl">
              {money(Math.abs(totals.net))}
              <span className="ml-2 font-sans text-base text-slate-400">
                {totals.net >= 0 ? "owed to you, net" : "you owe, net"}
              </span>
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Only your own share counts as spending — the rest is money you
              advanced and will get back.
            </p>
          </div>

          <Button icon={FiPlus} onClick={openAdd}>
            Split a bill
          </Button>
        </div>

        {totals.count > 0 && (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Owed to you", money(totals.owedToMe), "text-emerald-300"],
                ["You owe", money(totals.iOwe), "text-red-300"],
                [
                  "Your share",
                  money(totals.myShareTotal),
                  "",
                  `of ${money(totals.billedTotal)} billed`,
                ],
                ["Open splits", totals.open, ""],
              ].map(([label, value, tone, sub]) => (
                <div key={label} className="rounded-xl bg-slate-800/80 p-4">
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className={`mt-1 break-words text-2xl font-bold ${tone || ""}`}>
                    {value}
                  </p>
                  {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
                </div>
              ))}
            </div>

            {(overview?.people || []).length > 0 && (
              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="flex items-center gap-2 text-sm text-slate-400">
                  <FiUsers />
                  Net with each person
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {overview.people.map((person) => (
                    <span
                      key={person.name}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs"
                      title={`${money(person.owesMe)} owed to you · ${money(person.iOwe)} owed by you · ${person.splitCount} splits`}
                    >
                      {person.name}{" "}
                      <span
                        className={
                          person.net >= 0 ? "text-emerald-300" : "text-red-300"
                        }
                      >
                        {person.net >= 0 ? "+" : "−"}
                        {money(Math.abs(person.net))}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </motion.section>

      {/* ============ LIST ============ */}
      {splits.length === 0 ? (
        <EmptyState
          icon={FiUsers}
          title="No shared bills yet"
          message="Split a dinner, a trip or the rent, and track who still owes what."
          action={
            <Button icon={FiPlus} onClick={openAdd}>
              Split a bill
            </Button>
          }
        />
      ) : (
        <motion.section
          {...motionProps(0.05)}
          className="rounded-2xl border border-white/10 bg-slate-900 p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Splits</h2>

            <div className="flex flex-wrap gap-1 rounded-xl bg-slate-800 p-1">
              {[
                { key: "open", label: "Open" },
                { key: "settled", label: "Settled" },
                { key: "all", label: "All" },
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => setTab(option.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${
                    tab === option.key
                      ? "bg-indigo-400/15 text-indigo-200"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {visible.length === 0 ? (
              <EmptyState
                icon={FiUsers}
                title="Nothing here"
                message="No splits in this view."
              />
            ) : (
              visible.map((split) => (
                <div
                  key={split._id}
                  className={`rounded-2xl border p-4 ${
                    split.isFullySettled
                      ? "border-white/5 opacity-70"
                      : "border-white/10"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {split.paidByMe ? (
                          <FiArrowUpRight className="shrink-0 text-emerald-300" />
                        ) : (
                          <FiArrowDownLeft className="shrink-0 text-amber-300" />
                        )}
                        <span className="break-words">{split.description}</span>
                        {split.groupName && (
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-400">
                            {split.groupName}
                          </span>
                        )}
                        {split.isFullySettled && (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-200">
                            Settled
                          </span>
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(split.date)} ·{" "}
                        {split.paidByMe ? "you paid" : `${split.payerName} paid`}{" "}
                        {money(split.totalAmount)} · your share{" "}
                        {money(split.myShare)}
                      </p>
                    </div>

                    <div className="text-right">
                      {split.owedToMe > 0 && (
                        <p className="break-words text-xl font-bold text-emerald-300">
                          +{money(split.owedToMe)}
                        </p>
                      )}
                      {split.iOwe > 0 && (
                        <p className="break-words text-xl font-bold text-red-300">
                          −{money(split.iOwe)}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">
                        {split.owedToMe > 0 || split.iOwe > 0
                          ? "outstanding"
                          : "all square"}
                      </p>
                    </div>
                  </div>

                  {/* Participants */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {split.participants.map((participant) => {
                      const outstanding = round2(
                        Number(participant.share || 0) -
                          Number(participant.settledAmount || 0),
                      );

                      // Only the side that actually owes something can settle.
                      const canSettle =
                        outstanding > 0 &&
                        (split.paidByMe ? !participant.isMe : participant.isMe);

                      return (
                        <button
                          key={participant.name}
                          onClick={() =>
                            canSettle && openSettle(split, participant)
                          }
                          disabled={!canSettle}
                          className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                            canSettle
                              ? "border-white/10 bg-white/5 hover:border-indigo-400/40"
                              : "cursor-default border-white/5 bg-white/[0.02]"
                          }`}
                        >
                          <span className="block font-medium">
                            {participant.isMe ? "You" : participant.name}
                          </span>
                          <span className="text-slate-400">
                            {money(participant.share)}
                            {outstanding <= 0 ? (
                              <span className="ml-1 text-emerald-300">paid</span>
                            ) : canSettle ? (
                              <span className="ml-1 text-indigo-300">
                                · settle
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {split.advanceAmount > 0 && (
                      <span className="text-slate-500">
                        {money(split.advanceAmount)} advanced for others
                      </span>
                    )}

                    <button
                      onClick={() => requestDelete(split)}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-2.5 py-1.5 text-red-300 transition hover:border-red-500/40"
                    >
                      <FiTrash2 />
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.section>
      )}

      {/* ============ ADD ============ */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Split a bill"
        maxWidth="max-w-3xl"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="What was it for"
            placeholder="Dinner at Bikanervala"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <Input
            label="Total bill"
            type="number"
            value={form.totalAmount}
            onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
          />

          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />

          <Input
            label="Category"
            placeholder="Food"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />

          <Input
            label="Group (optional)"
            placeholder="Goa trip"
            value={form.groupName}
            onChange={(e) => setForm({ ...form, groupName: e.target.value })}
          />

          <Select
            label="Split how"
            value={form.splitMethod}
            onChange={(e) => setForm({ ...form, splitMethod: e.target.value })}
          >
            {(options?.methods || []).map((method) => (
              <option key={method.key} value={method.key}>
                {method.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Who paid */}
        <div className="mt-4">
          <p className="mb-2 text-sm text-slate-400">Who paid</p>
          <div className="flex flex-wrap gap-2">
            {[
              { key: true, label: "I paid" },
              { key: false, label: "Someone else paid" },
            ].map((option) => (
              <button
                key={String(option.key)}
                onClick={() => setForm({ ...form, paidByMe: option.key })}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  form.paidByMe === option.key
                    ? "border-indigo-400 bg-indigo-500/15 text-indigo-200"
                    : "border-white/10 bg-slate-800 text-slate-300 hover:border-white/30"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {form.paidByMe ? (
              <Select
                label="Paid from"
                value={form.accountId}
                onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.name} — {money(account.balance)}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                label="Who paid it"
                placeholder="Sita"
                value={form.payerName}
                onChange={(e) => setForm({ ...form, payerName: e.target.value })}
              />
            )}
          </div>
        </div>

        {/* Participants */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Who is splitting it
              {form.splitMethod !== "equal" && (
                <span className="ml-1 text-xs text-slate-500">
                  (
                  {form.splitMethod === "exact"
                    ? "amounts"
                    : form.splitMethod === "percentage"
                      ? "percentages"
                      : "share weights"}
                  )
                </span>
              )}
            </p>
            <button
              onClick={addParticipant}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-white/20"
            >
              <FiUserPlus />
              Add person
            </button>
          </div>

          <div className="space-y-2">
            {form.participants.map((participant, index) => (
              <div
                key={index}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-800/60 p-2"
              >
                <input
                  aria-label={`Person ${index + 1} name`}
                  value={participant.name}
                  onChange={(e) => setParticipant(index, { name: e.target.value })}
                  placeholder="Name"
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-800 p-2 text-sm"
                />

                {form.splitMethod !== "equal" && (
                  <input
                    aria-label={`Person ${index + 1} share`}
                    type="number"
                    value={participant.shareInput}
                    onChange={(e) =>
                      setParticipant(index, { shareInput: e.target.value })
                    }
                    placeholder={
                      form.splitMethod === "percentage" ? "%" : "value"
                    }
                    className="w-24 rounded-lg border border-white/10 bg-slate-800 p-2 text-sm"
                  />
                )}

                <span className="w-24 text-right text-sm font-semibold">
                  {money(shares[index])}
                </span>

                <label className="flex items-center gap-1.5 text-xs text-slate-400">
                  <input
                    type="radio"
                    name="isMe"
                    checked={participant.isMe}
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        participants: prev.participants.map((p, i) => ({
                          ...p,
                          isMe: i === index,
                        })),
                      }))
                    }
                  />
                  me
                </label>

                {form.participants.length > 2 && (
                  <button
                    onClick={() => removeParticipant(index)}
                    aria-label={`Remove person ${index + 1}`}
                    className="rounded-lg p-1.5 text-slate-500 transition hover:text-red-300"
                  >
                    <FiX />
                  </button>
                )}
              </div>
            ))}
          </div>

          {!sharesMatch && billTotal > 0 && (
            <p className="mt-2 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">
              <FiAlertTriangle className="mt-0.5 shrink-0" />
              Shares add up to {money(shareSum)}, but the bill is{" "}
              {money(billTotal)}.
            </p>
          )}
        </div>

        {/* What this does to the books */}
        {billTotal > 0 && (
          <div className="mt-5 rounded-xl bg-slate-800/80 p-4 text-sm">
            <p className="text-slate-400">What gets recorded</p>

            {form.paidByMe ? (
              <div className="mt-2 space-y-1">
                <p>
                  <span className="font-semibold text-red-300">
                    {money(billTotal)}
                  </span>{" "}
                  leaves your account
                </p>
                <p>
                  <span className="font-semibold">
                    {money(myPreviewShare)}
                  </span>{" "}
                  is booked as your expense
                </p>
                <p className="text-slate-400">
                  {money(round2(billTotal - myPreviewShare))} is money you
                  advanced — owed back, not spending
                </p>
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                <p>Nothing moves now.</p>
                <p className="text-slate-400">
                  Your {money(myPreviewShare)} share becomes an expense when
                  you settle it with {form.payerName || "them"}.
                </p>
              </div>
            )}
          </div>
        )}

        <Input
          label="Note"
          containerClassName="mt-3"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowModal(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Record split
          </Button>
        </div>
      </Modal>

      {/* ============ SETTLE ============ */}
      <Modal
        isOpen={!!settleTarget}
        onClose={() => setSettleTarget(null)}
        title={
          settleTarget
            ? settleTarget.split.paidByMe
              ? `${settleTarget.participant.name} paid you back`
              : `Pay your share to ${settleTarget.split.payerName}`
            : ""
        }
        maxWidth="max-w-md"
      >
        {settleTarget && (
          <>
            <Input
              label="Amount"
              type="number"
              value={settleForm.amount}
              onChange={(e) =>
                setSettleForm({ ...settleForm, amount: e.target.value })
              }
            />

            <button
              onClick={() =>
                setSettleForm({
                  ...settleForm,
                  amount: String(settleTarget.outstanding),
                })
              }
              className="mt-2 rounded-lg bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
            >
              All of it · {money(settleTarget.outstanding)}
            </button>

            <Select
              label={settleTarget.split.paidByMe ? "Received into" : "Paid from"}
              containerClassName="mt-3"
              value={settleForm.accountId}
              onChange={(e) =>
                setSettleForm({ ...settleForm, accountId: e.target.value })
              }
            >
              <option value="">Not through an account</option>
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.name} — {money(account.balance)}
                </option>
              ))}
            </Select>

            <p className="mt-3 text-xs text-slate-500">
              {!settleForm.accountId
                ? "No account chosen — the split updates but no balance moves."
                : settleTarget.split.paidByMe
                  ? "This will be credited to the chosen account."
                  : "This will be debited, and your share booked as an expense."}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setSettleTarget(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSettle} loading={saving} icon={FiCheck}>
                Record
              </Button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteImpact(null);
        }}
        onConfirm={handleDelete}
        title="Remove this split?"
        message={deleteMessage()}
        confirmLabel="Remove"
        loading={deleting}
      />
    </DashboardLayout>
  );
}
