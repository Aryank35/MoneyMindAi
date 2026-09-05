import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FiRepeat,
  FiSearch,
  FiTrash2,
  FiArrowRight,
  FiArrowDown,
  FiCheckCircle,
} from "react-icons/fi";

import DashboardLayout from "../components/layout/DashboardLayout";
import { getAccountsByUser } from "../services/accountService";

import {
  getTransfersByUser,
  createTransfer,
  deleteTransfer,
} from "../services/transferService";

import { getUserId } from "../utils/auth";
import { CHART_ACCENT } from "../utils/chartTheme";
import { useToast } from "../components/common/Toast";
import { PageLoader } from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import ConfirmDialog from "../components/common/ConfirmDialog";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function Transfer() {
  const toast = useToast();

  const [accounts, setAccounts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    fromAccount: "",
    toAccount: "",
    amount: "",
    note: "",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
  });

  const fetchAccounts = async () => {
    try {
      const response = await getAccountsByUser(getUserId());

      setAccounts(response.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTransfers = async () => {
    try {
      const response = await getTransfersByUser(getUserId());

      setTransfers(response.data || []);
    } catch (error) {
      console.error(error);

      setTransfers([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchAccounts(), fetchTransfers()]);

      setLoading(false);
    };

    loadData();
  }, []);

  const fromAccountData = accounts.find(
    (account) => account._id === formData.fromAccount,
  );

  const toAccountData = accounts.find(
    (account) => account._id === formData.toAccount,
  );

  const amountValue = Number(formData.amount || 0);

  const fromBalanceAfter = fromAccountData
    ? Number(fromAccountData.balance || 0) - amountValue
    : 0;

  const toBalanceAfter = toAccountData
    ? Number(toAccountData.balance || 0) + amountValue
    : 0;

  const handleSwap = () => {
    setFormData({
      ...formData,
      fromAccount: formData.toAccount,
      toAccount: formData.fromAccount,
    });
  };

  const handleTransfer = async () => {
    try {
      if (!formData.fromAccount || !formData.toAccount) {
        toast.error("Please select both accounts");

        return;
      }

      if (formData.fromAccount === formData.toAccount) {
        toast.error("Source and destination accounts must be different");

        return;
      }

      if (amountValue <= 0) {
        toast.error("Amount must be greater than 0");

        return;
      }

      if (fromAccountData && amountValue > Number(fromAccountData.balance)) {
        toast.error("Insufficient balance in source account");

        return;
      }

      setSubmitting(true);

      const transferDate = new Date(`${formData.date}T${formData.time}`);

      await createTransfer({
        userId: getUserId(),
        fromAccountId: formData.fromAccount,
        toAccountId: formData.toAccount,
        amount: amountValue,
        note: formData.note,
        transferDate,
      });

      setFormData({
        fromAccount: "",
        toAccount: "",
        amount: "",
        note: "",
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().slice(0, 5),
      });

      await Promise.all([fetchAccounts(), fetchTransfers()]);

      toast.success("Transfer completed successfully");
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.message || "Transfer failed");
    } finally {
      setSubmitting(false);
    }
  };

  const requestDeleteTransfer = (transfer) => {
    setDeleteTarget(transfer);
  };

  const confirmDeleteTransfer = async () => {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      await deleteTransfer(deleteTarget._id);

      await Promise.all([fetchAccounts(), fetchTransfers()]);

      toast.success("Transfer deleted");

      setDeleteTarget(null);
    } catch (error) {
      console.error(error);

      toast.error("Failed to delete transfer");
    } finally {
      setDeleting(false);
    }
  };

  const getAccount = (id) => accounts.find((account) => account._id === id);

  const todayTransferred = transfers
    .filter(
      (transfer) =>
        new Date(transfer.transferDate).toDateString() ===
        new Date().toDateString(),
    )
    .reduce((sum, transfer) => sum + Number(transfer.amount), 0);

  const monthTransferred = transfers
    .filter((transfer) => {
      const transferDate = new Date(transfer.transferDate);

      const now = new Date();

      return (
        transferDate.getMonth() === now.getMonth() &&
        transferDate.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, transfer) => sum + Number(transfer.amount), 0);

  const filteredTransfers = transfers.filter((transfer) => {
    const from = getAccount(transfer.fromAccountId);
    const to = getAccount(transfer.toAccountId);

    const term = searchTerm.toLowerCase();

    return (
      !term ||
      from?.name?.toLowerCase().includes(term) ||
      to?.name?.toLowerCase().includes(term) ||
      transfer.note?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoader label="Loading transfers..." />
      </DashboardLayout>
    );
  }

  const renderAccountTiles = (side) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {accounts.map((account, index) => {
        const otherSide = side === "from" ? formData.toAccount : formData.fromAccount;
        const isDisabled = account._id === otherSide;
        const isSelected =
          side === "from"
            ? formData.fromAccount === account._id
            : formData.toAccount === account._id;

        return (
          <motion.button
            type="button"
            key={account._id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            disabled={isDisabled}
            onClick={() =>
              setFormData({
                ...formData,
                [side === "from" ? "fromAccount" : "toAccount"]: account._id,
              })
            }
            className={`
              p-4 rounded-2xl border transition-all text-left
              ${isDisabled ? "opacity-30 cursor-not-allowed" : "hover:border-indigo-400"}
              ${
                isSelected
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-slate-700 bg-slate-800"
              }
            `}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: (account.color || CHART_ACCENT) + "30" }}
            >
              {account.icon || "🏦"}
            </div>

            <h3 className="font-semibold mt-2">{account.name}</h3>

            <p className="text-xs text-slate-400">{account.type}</p>

            <p className="text-green-400 mt-2">
              ₹{Number(account.balance || 0).toLocaleString()}
            </p>
          </motion.button>
        );
      })}

      {accounts.length === 0 && (
        <div className="col-span-full">
          <EmptyState
            icon={FiRepeat}
            title="No accounts found"
            message="Add an account first to start transferring money."
          />
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-300">
              <FiRepeat />
            </span>
            Transfer
          </h1>

          <p className="text-slate-400 mt-2">
            Move money between your own bank accounts
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.05 } },
        }}
      >
        {[
          {
            key: "today",
            label: "Today",
            value: todayTransferred,
            classes: "bg-indigo-500/10 border-indigo-500/20",
          },
          {
            key: "month",
            label: "This Month",
            value: monthTransferred,
            classes: "bg-purple-500/10 border-purple-500/20",
          },
          {
            key: "total",
            label: "Total Transfers",
            value: transfers.length,
            classes: "bg-green-500/10 border-green-500/20",
            raw: true,
          },
          {
            key: "accounts",
            label: "Accounts",
            value: accounts.length,
            classes: "bg-orange-500/10 border-orange-500/20",
            raw: true,
          },
        ].map((card) => (
          <motion.div
            key={card.key}
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0 },
            }}
            className={`border rounded-2xl p-5 ${card.classes}`}
          >
            <p className="text-slate-400">{card.label}</p>
            <h2 className="text-2xl font-bold">
              {card.raw ? card.value : `₹${card.value.toLocaleString()}`}
            </h2>
          </motion.div>
        ))}
      </motion.div>

      {/* New Transfer form */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-5">New Transfer</h2>

        {accounts.length < 2 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 p-4 rounded-2xl mb-6">
            You need at least two accounts to make a transfer. Add another
            account from the Accounts page.
          </div>
        )}

        <div className="flex flex-col md:flex-row items-stretch gap-4">
          <div className="flex-1">
            <p className="text-slate-400 mb-2 font-medium">From Account</p>
            {renderAccountTiles("from")}
          </div>

          <div className="flex md:flex-col items-center justify-center">
            <button
              type="button"
              onClick={handleSwap}
              disabled={!formData.fromAccount && !formData.toAccount}
              title="Swap accounts"
              aria-label="Swap from and to accounts"
              className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 hover:border-indigo-500 flex items-center justify-center text-indigo-300 disabled:opacity-30 transition"
            >
              <span className="hidden md:inline">
                <FiArrowDown size={18} />
              </span>
              <span className="md:hidden">
                <FiArrowRight size={18} />
              </span>
            </button>
          </div>

          <div className="flex-1">
            <p className="text-slate-400 mb-2 font-medium">To Account</p>
            {renderAccountTiles("to")}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <div>
            <label htmlFor="transfer-amount" className="block mb-2 text-slate-400">
              Amount
            </label>

            <input
              id="transfer-amount"
              type="number"
              placeholder="Amount"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              className="w-full bg-slate-800 rounded-xl p-3 outline-none border border-slate-700 focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="transfer-note" className="block mb-2 text-slate-400">
              Note (optional)
            </label>

            <input
              id="transfer-note"
              type="text"
              placeholder="Note (optional)"
              value={formData.note}
              onChange={(e) =>
                setFormData({ ...formData, note: e.target.value })
              }
              className="w-full bg-slate-800 rounded-xl p-3 outline-none border border-slate-700 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="transfer-date" className="block mb-2 text-slate-400">
                Date
              </label>

              <input
                id="transfer-date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full bg-slate-800 rounded-xl p-3 border border-slate-700 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="transfer-time" className="block mb-2 text-slate-400">
                Time
              </label>

              <input
                id="transfer-time"
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
                className="w-full bg-slate-800 rounded-xl p-3 border border-slate-700 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Live preview */}
        {(fromAccountData || toAccountData) && (
          <div className="grid md:grid-cols-2 gap-4 mt-5">
            <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
              <h3 className="font-semibold">
                {fromAccountData?.icon} {fromAccountData?.name || "From Account"}
              </h3>

              <p className="text-slate-400 text-sm mt-1">
                Current: ₹
                {Number(fromAccountData?.balance || 0).toLocaleString()}
              </p>

              <p
                className={`mt-1 font-medium ${
                  fromBalanceAfter < 0 ? "text-red-400" : "text-yellow-400"
                }`}
              >
                Balance After: ₹{fromBalanceAfter.toLocaleString()}
              </p>

              {fromBalanceAfter < 0 && (
                <p className="text-red-500 text-sm mt-1">
                  ⚠ Insufficient balance
                </p>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
              <h3 className="font-semibold">
                {toAccountData?.icon} {toAccountData?.name || "To Account"}
              </h3>

              <p className="text-slate-400 text-sm mt-1">
                Current: ₹{Number(toAccountData?.balance || 0).toLocaleString()}
              </p>

              <p className="text-green-400 mt-1 font-medium">
                Balance After: ₹{toBalanceAfter.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleTransfer}
          disabled={submitting}
          className="mt-6 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-3 rounded-xl transition"
        >
          <FiCheckCircle />
          {submitting ? "Transferring..." : "Transfer Money"}
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <label htmlFor="transfer-search" className="sr-only">
            Search transfers
          </label>

          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

          <input
            id="transfer-search"
            type="text"
            placeholder="Search transfers by account or note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Transfer history table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10">
          <h2 className="text-xl font-semibold">Transfer History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="text-left p-5">From</th>
                <th className="text-left p-5"></th>
                <th className="text-left p-5">To</th>
                <th className="text-left p-5">Date</th>
                <th className="text-left p-5">Note</th>
                <th className="text-right p-5">Amount</th>
                <th className="text-center p-5">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredTransfers?.length > 0 ? (
                filteredTransfers.map((transfer, index) => {
                  const from = getAccount(transfer.fromAccountId);
                  const to = getAccount(transfer.toAccountId);

                  return (
                    <motion.tr
                      key={transfer._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: Math.min(index, 10) * 0.02 }}
                      className="border-b border-white/5 hover:bg-white/5 transition"
                    >
                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          <span>{from?.icon}</span>
                          <span>{from?.name || "Deleted Account"}</span>
                        </div>
                      </td>

                      <td className="p-5 text-slate-500">
                        <FiArrowRight />
                      </td>

                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          <span>{to?.icon}</span>
                          <span>{to?.name || "Deleted Account"}</span>
                        </div>
                      </td>

                      <td className="p-5">
                        {transfer.transferDate
                          ? new Date(transfer.transferDate).toLocaleString()
                          : "N/A"}
                      </td>

                      <td className="p-5 text-slate-400">{transfer.note}</td>

                      <td className="p-5 text-right text-indigo-300 font-medium">
                        ₹{Number(transfer.amount).toLocaleString()}
                      </td>

                      <td className="p-5 text-center">
                        <button
                          onClick={() => requestDeleteTransfer(transfer)}
                          aria-label="Delete transfer"
                          className="text-red-400 hover:text-red-300"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="p-6">
                    <EmptyState
                      icon={FiRepeat}
                      title="No transfers yet"
                      message="Transfers you make between accounts will show up here."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => (deleting ? null : setDeleteTarget(null))}
        onConfirm={confirmDeleteTransfer}
        title="Delete this transfer?"
        message={
          deleteTarget
            ? `This permanently deletes the transfer of ${money(deleteTarget.amount)} and moves the money back: ${
                getAccount(deleteTarget.fromAccountId)?.name || "the source account"
              } is credited and ${
                getAccount(deleteTarget.toAccountId)?.name || "the destination account"
              } is debited. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        loading={deleting}
      />
    </DashboardLayout>
  );
}
