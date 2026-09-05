import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiCreditCard } from "react-icons/fi";

import {
  createAccount,
  getAccountsByUser,
  deleteAccount,
  updateAccount,
  setAccountRole,
  getAccountDeleteImpact,
} from "../services/accountService";

import { getUserId } from "../utils/auth";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useToast } from "../components/common/Toast";
import EmptyState from "../components/common/EmptyState";
import Modal from "../components/common/Modal";
import Button from "../components/common/Button";
import Input, { Select } from "../components/common/Input";

// The two exclusive account roles, described once and reused by the cards
// and both modals. Adding another exclusive role means one entry here.
const ROLE_DEFS = [
  {
    role: "isSalaryAccount",
    label: "Salary Account",
    holderOf: ({ salaryAccount }) => salaryAccount,
    help: "Salary income on the income page is credited here.",
  },
  {
    role: "isEpfAccount",
    label: "EPF Account",
    holderOf: ({ epfAccount }) => epfAccount,
    help: "The EPF withheld from each salary entry accumulates here instead of your bank.",
  },
];

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function Accounts() {
  const toast = useToast();

  const [accounts, setAccounts] = useState([]);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedAccount, setSelectedAccount] = useState(null);

  const [deleteText, setDeleteText] = useState("");

  const [deleteImpact, setDeleteImpact] = useState(null);

  const [roleBusy, setRoleBusy] = useState(null);

  const [deleting, setDeleting] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);

  const [editingAccount, setEditingAccount] = useState(null);

  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "Bank",
    balance: "",
    isSalaryAccount: false,
    isEpfAccount: false,
  });

  // One card treatment for every account type. The type reads through the
  // icon and a single accent hairline rather than a different gradient each -
  // seven competing gradients was the loudest thing on the page.
  const accountThemes = {
    Bank: { accent: "bg-indigo-400/70", tint: "text-indigo-200", icon: "\ud83c\udfe6" },
    Cash: { accent: "bg-emerald-400/70", tint: "text-emerald-200", icon: "\ud83d\udcb5" },
    UPI: { accent: "bg-cyan-400/70", tint: "text-cyan-200", icon: "\ud83d\udcf1" },
    Wallet: { accent: "bg-cyan-400/70", tint: "text-cyan-200", icon: "\ud83d\udc5b" },
    "Credit Card": { accent: "bg-red-400/70", tint: "text-red-200", icon: "\ud83d\udcb3" },
    Investment: { accent: "bg-indigo-400/70", tint: "text-indigo-200", icon: "\ud83d\udcc8" },
    EPF: { accent: "bg-amber-400/70", tint: "text-amber-200", icon: "\ud83d\udee1\ufe0f" },
  };

  const loadAccounts = async () => {
    try {
      const res = await getAccountsByUser(getUserId());

      setAccounts(res.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await loadAccounts();
    };

    loadData();
  }, []);

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.balance) {
        toast.error("Please fill all fields");
        return;
      }

      setSaving(true);

      const payload = {
        ...formData,
        balance: Number(formData.balance),
        userId: getUserId(),
      };

      await createAccount(payload);

      setFormData({
        name: "",
        type: "Bank",
        balance: "",
        isSalaryAccount: false,
        isEpfAccount: false,
      });

      setShowCreateModal(false);

      await loadAccounts();

      toast.success("Account created");
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to create account",
      );
    } finally {
      setSaving(false);
    }
  };

  // Pull the impact before opening the dialog so the warning can be specific
  // about what deleting this account leaves orphaned.
  const requestDelete = async (account) => {
    setSelectedAccount(account);
    setDeleteImpact(null);
    setShowDeleteModal(true);

    try {
      const response = await getAccountDeleteImpact(account._id);

      setDeleteImpact(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (deleteText !== "DELETE") return;

    setDeleting(true);

    try {
      await deleteAccount(selectedAccount._id);

      setDeleteText("");

      setSelectedAccount(null);

      setShowDeleteModal(false);

      await loadAccounts();

      toast.success("Account deleted");
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.message || "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdate = async () => {
    try {
      if (!editingAccount) return;

      setSaving(true);

      await updateAccount(editingAccount._id, {
        ...formData,
        balance: Number(formData.balance),
      });

      setShowEditModal(false);

      setEditingAccount(null);

      setFormData({
        name: "",
        type: "Bank",
        balance: "",
        isSalaryAccount: false,
        isEpfAccount: false,
      });

      await loadAccounts();

      toast.success("Account updated");
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.message || "Failed to update account");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRole = async (account, role, label, claim) => {
    setRoleBusy(`${account._id}:${role}`);

    try {
      await setAccountRole(account._id, role, claim);

      await loadAccounts();

      toast.success(
        claim
          ? `${account.name} is now your ${label}`
          : `${account.name} is no longer your ${label}`,
      );
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.message || `Failed to update ${label}`,
      );
    } finally {
      setRoleBusy(null);
    }
  };

  const totalAssets = accounts.reduce(
    (sum, account) => sum + Number(account.balance || 0),
    0,
  );

  const salaryAccount = accounts.find((account) => account.isSalaryAccount);

  const roleHolder = (role) => accounts.find((account) => account[role]);

  const epfAccount = accounts.find((account) => account.isEpfAccount);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">My Accounts</h1>

          <p className="text-slate-400 mt-2">
            Manage all your bank accounts, wallets and payment methods.
          </p>
        </div>

        <div className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-900 p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
            Total Assets
          </p>

          <h2 className="mt-3 text-5xl font-semibold tracking-tight text-white">
            ₹{totalAssets.toLocaleString()}
          </h2>

          <p className="mt-3 text-sm text-slate-400">
            Across {accounts.length} account{accounts.length === 1 ? "" : "s"}
          </p>

          <div className="mt-5 h-px bg-white/10" />

          <p className="mt-4 text-sm text-slate-400">
            {salaryAccount
              ? `Salary is credited to ${salaryAccount.name}.`
              : "No salary account linked yet. Mark one below so income entries land in the right place."}
          </p>

          <p className="mt-1 text-sm text-slate-400">
            {epfAccount
              ? `EPF accumulates in ${epfAccount.name}.`
              : "No EPF account linked yet. EPF on salary entries will be recorded but not credited anywhere."}
          </p>
        </div>

        <Button onClick={() => setShowCreateModal(true)} className="mb-8">
          + Add Account
        </Button>

        {accounts.length === 0 ? (
          <EmptyState
            icon={FiCreditCard}
            title="No accounts yet"
            message="Add your first bank account, wallet, or payment method to get started."
          />
        ) : (
          <motion.div
            className="grid md:grid-cols-2 xl:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } },
            }}
          >
            {accounts.map((account) => {
              const theme = accountThemes[account.type] || accountThemes.Bank;

              const allocation =
                totalAssets > 0
                  ? ((Number(account.balance) / totalAssets) * 100).toFixed(1)
                  : 0;

              return (
                <motion.div
                  key={account._id}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  className="
                    group relative overflow-hidden rounded-2xl border
                    border-white/10 bg-slate-900 p-6 shadow-xl shadow-black/40
                    transition-all duration-200
                    hover:-translate-y-0.5 hover:border-white/20
                  "
                >
                  <span
                    className={`absolute inset-x-0 top-0 h-px ${theme.accent}`}
                    aria-hidden="true"
                  />

                  <div className="flex justify-between">
                    <div className="text-5xl">{theme.icon}</div>

                    <div className="text-xs tracking-widest text-slate-500">
                      **** {String(account._id).slice(-4)}
                    </div>
                  </div>

                  <h2 className="mt-8 text-xl font-bold">{account.name}</h2>

                  <p className={`text-sm ${theme.tint}`}>{account.type}</p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {account.isSalaryAccount && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/30 bg-indigo-400/10 px-3 py-1 text-xs font-semibold text-indigo-200">
                        Salary Account
                      </span>
                    )}
                    {account.isEpfAccount && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                        EPF Account
                      </span>
                    )}
                  </div>

                  <h3 className="text-4xl font-bold mt-4">
                    ₹{Number(account.balance).toLocaleString()}
                  </h3>

                  <div className="mt-4">
                    <div className="h-1 w-full rounded-full bg-white/10">
                      <div
                        className={`h-1 rounded-full ${theme.accent}`}
                        style={{
                          width: `${allocation}%`,
                        }}
                      />
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      {allocation}% of assets
                    </p>
                  </div>

                  <div className="mt-6 space-y-2">
                    {ROLE_DEFS.map(({ role, label, holderOf }) => {
                      const holder = holderOf({ salaryAccount, epfAccount });
                      const isHolder = Boolean(account[role]);
                      // Taken by a different account - the role has to be
                      // released there before it can be claimed here.
                      const lockedBy = !isHolder ? holder : null;
                      const busy = roleBusy === `${account._id}:${role}`;

                      return (
                        <button
                          key={role}
                          onClick={() =>
                            handleToggleRole(account, role, label, !isHolder)
                          }
                          disabled={Boolean(lockedBy) || busy}
                          title={
                            lockedBy
                              ? `${lockedBy.name} is currently your ${label}. Remove it there first.`
                              : undefined
                          }
                          aria-label={
                            lockedBy
                              ? `${label} is already held by ${lockedBy.name}`
                              : isHolder
                                ? `Remove ${account.name} as ${label}`
                                : `Set ${account.name} as ${label}`
                          }
                          className={`w-full rounded-xl border py-2 text-sm transition ${
                            lockedBy
                              ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-600"
                              : isHolder
                                ? "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200"
                                : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-white"
                          } disabled:cursor-not-allowed`}
                        >
                          {lockedBy
                            ? `${label}: ${lockedBy.name}`
                            : isHolder
                              ? `Remove as ${label}`
                              : `Set as ${label}`}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => {
                        setEditingAccount(account);

                        setFormData({
                          name: account.name,
                          type: account.type,
                          balance: account.balance,
                          isSalaryAccount: Boolean(account.isSalaryAccount),
                          isEpfAccount: Boolean(account.isEpfAccount),
                        });

                        setShowEditModal(true);
                      }}
                      aria-label={`Edit ${account.name}`}
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => requestDelete(account)}
                      aria-label={`Delete ${account.name}`}
                      className="w-full rounded-xl border border-red-500/20 bg-red-500/10 py-2 text-sm text-red-300 transition hover:border-red-500/40 hover:text-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create Account"
        >
          <div className="space-y-4">
            <Input
              label="Account Name"
              placeholder="Account Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
            />

            <Select
              label="Account Type"
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value,
                })
              }
            >
              <option>Bank</option>
              <option>Cash</option>
              <option>UPI</option>
              <option>Wallet</option>
              <option>Investment</option>
              <option>Credit Card</option>
              <option>EPF</option>
            </Select>

            <Input
              label="Opening Balance"
              type="number"
              placeholder="Opening Balance"
              value={formData.balance}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  balance: e.target.value,
                })
              }
            />

            {ROLE_DEFS.map(({ role, label, help }) => {
              const holder = roleHolder(role);
              const lockedBy =
                holder && String(holder._id) !== String("") ? holder : null;

              return (
                <label
                  key={role}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${
                    lockedBy
                      ? "cursor-not-allowed border-slate-800 bg-slate-900 text-slate-500"
                      : "border-slate-700 bg-slate-800 text-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    disabled={Boolean(lockedBy)}
                    checked={Boolean(formData[role]) && !lockedBy}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        [role]: e.target.checked,
                      })
                    }
                  />
                  <span>
                    {label}
                    <span className="mt-1 block text-xs text-slate-500">
                      {lockedBy
                        ? `${lockedBy.name} already holds this. Remove the role from it first, then set it here.`
                        : `${help} Only one account can hold this.`}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button onClick={handleSave} loading={saving}>
              Create
            </Button>
          </div>
        </Modal>

        <Modal
          isOpen={showDeleteModal}
          onClose={() => (deleting ? null : setShowDeleteModal(false))}
          title="Delete Account"
          maxWidth="max-w-sm"
        >
          <p className="text-slate-300">
            This will permanently delete{" "}
            <span className="font-semibold">{selectedAccount?.name}</span>
            {deleteImpact ? ` holding ${money(deleteImpact.balance)}` : ""}.
          </p>

          {deleteImpact?.hasLinkedRecords && (
            <p className="mt-3 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-200">
              {deleteImpact.incomeCount > 0 &&
                `${deleteImpact.incomeCount} income entr${deleteImpact.incomeCount === 1 ? "y" : "ies"} worth ${money(deleteImpact.incomeTotal)}`}
              {deleteImpact.incomeCount > 0 && deleteImpact.expenseCount > 0 && " and "}
              {deleteImpact.expenseCount > 0 &&
                `${deleteImpact.expenseCount} expense${deleteImpact.expenseCount === 1 ? "" : "s"}`}
              {" "}point at this account. They are not deleted, but they will
              reference an account that no longer exists.
            </p>
          )}

          {(deleteImpact?.isSalaryAccount || deleteImpact?.isEpfAccount) && (
            <p className="mt-3 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-200">
              This is your{" "}
              {deleteImpact.isSalaryAccount ? "salary" : "EPF"} account. Deleting
              it unlinks it, and new entries will have nowhere to land until you
              mark another.
            </p>
          )}

          <p className="mt-3 text-slate-300">
            Type <span className="font-mono text-red-300">DELETE</span> to
            confirm.
          </p>

          <Input
            containerClassName="mt-4"
            value={deleteText}
            onChange={(e) => setDeleteText(e.target.value)}
            aria-label="Type DELETE to confirm"
          />

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteText("");
                setDeleteImpact(null);

                setShowDeleteModal(false);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              disabled={deleteText !== "DELETE"}
              loading={deleting}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </Modal>

        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingAccount(null);
          }}
          title="Edit Account"
        >
          <div className="space-y-4">
            <Input
              label="Account Name"
              placeholder="Account Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
            />

            <Select
              label="Account Type"
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value,
                })
              }
            >
              <option>Bank</option>
              <option>Cash</option>
              <option>UPI</option>
              <option>Wallet</option>
              <option>Investment</option>
              <option>Credit Card</option>
              <option>EPF</option>
            </Select>

            <Input
              label="Balance"
              type="number"
              placeholder="Balance"
              value={formData.balance}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  balance: e.target.value,
                })
              }
            />

            {ROLE_DEFS.map(({ role, label, help }) => {
              const holder = roleHolder(role);
              const lockedBy =
                holder && String(holder._id) !== String(editingAccount?._id || "") ? holder : null;

              return (
                <label
                  key={role}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${
                    lockedBy
                      ? "cursor-not-allowed border-slate-800 bg-slate-900 text-slate-500"
                      : "border-slate-700 bg-slate-800 text-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    disabled={Boolean(lockedBy)}
                    checked={Boolean(formData[role]) && !lockedBy}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        [role]: e.target.checked,
                      })
                    }
                  />
                  <span>
                    {label}
                    <span className="mt-1 block text-xs text-slate-500">
                      {lockedBy
                        ? `${lockedBy.name} already holds this. Remove the role from it first, then set it here.`
                        : `${help} Only one account can hold this.`}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="secondary"
              onClick={() => {
                setShowEditModal(false);
                setEditingAccount(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button onClick={handleUpdate} loading={saving}>
              Update
            </Button>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
