import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiCreditCard } from "react-icons/fi";

import {
  createAccount,
  getAccountsByUser,
  deleteAccount,
  updateAccount,
} from "../services/accountService";

import { getUserId } from "../utils/auth";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useToast } from "../components/common/Toast";
import EmptyState from "../components/common/EmptyState";
import Modal from "../components/common/Modal";
import Button from "../components/common/Button";
import Input, { Select } from "../components/common/Input";

export default function Accounts() {
  const toast = useToast();

  const [accounts, setAccounts] = useState([]);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedAccount, setSelectedAccount] = useState(null);

  const [deleteText, setDeleteText] = useState("");

  const [deleting, setDeleting] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);

  const [editingAccount, setEditingAccount] = useState(null);

  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "Bank",
    balance: "",
  });

  const accountThemes = {
    Bank: {
      gradient: "from-blue-600 via-indigo-600 to-purple-700",
      icon: "🏦",
    },

    Cash: {
      gradient: "from-green-500 via-emerald-600 to-teal-700",
      icon: "💵",
    },

    UPI: {
      gradient: "from-orange-500 via-red-500 to-pink-600",
      icon: "📱",
    },

    Wallet: {
      gradient: "from-cyan-500 via-sky-600 to-blue-700",
      icon: "👛",
    },

    "Credit Card": {
      gradient: "from-slate-700 via-slate-800 to-black",
      icon: "💳",
    },
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

  const totalAssets = accounts.reduce(
    (sum, account) => sum + Number(account.balance || 0),
    0,
  );

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">My Accounts</h1>

          <p className="text-slate-400 mt-2">
            Manage all your bank accounts, wallets and payment methods.
          </p>
        </div>

        <div
          className="
    rounded-3xl
    p-8
    mb-8
    bg-gradient-to-r
    from-indigo-600
    via-purple-600
    to-pink-600
  "
        >
          <p className="opacity-80">Total Assets</p>

          <h2 className="text-5xl font-bold mt-3">
            ₹{totalAssets.toLocaleString()}
          </h2>

          <p className="mt-3 opacity-80">Across {accounts.length} accounts</p>
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
                  className={`
            relative
            overflow-hidden
            rounded-2xl
            p-6
            bg-gradient-to-br
            ${theme.gradient}
            shadow-xl
            hover:scale-[1.03]
            transition-all
          `}
                >
                  <div className="flex justify-between">
                    <div className="text-5xl">{theme.icon}</div>

                    <div className="text-xs opacity-70">
                      **** {String(account._id).slice(-4)}
                    </div>
                  </div>

                  <h2 className="mt-8 text-xl font-bold">{account.name}</h2>

                  <p className="opacity-80">{account.type}</p>

                  <h3 className="text-4xl font-bold mt-4">
                    ₹{Number(account.balance).toLocaleString()}
                  </h3>

                  <div className="mt-4">
                    <div className="w-full h-2 bg-white/20 rounded-full">
                      <div
                        className="h-2 bg-white rounded-full"
                        style={{
                          width: `${allocation}%`,
                        }}
                      />
                    </div>

                    <p className="text-xs mt-2">{allocation}% of assets</p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedAccount(account);

                      setShowDeleteModal(true);
                    }}
                    aria-label={`Delete ${account.name}`}
                    className="
              mt-6
              w-full
              py-2
              rounded-xl
              bg-red-500/20
              text-red-200
            "
                  >
                    Delete
                  </button>

                  <button
                    onClick={() => {
                      setEditingAccount(account);

                      setFormData({
                        name: account.name,
                        type: account.type,
                        balance: account.balance,
                      });

                      setShowEditModal(true);
                    }}
                    aria-label={`Edit ${account.name}`}
                    className="
    mt-2
              w-full
              py-2
              rounded-xl
              bg-white/10
              hover:bg-white/20
              transition
  "
                  >
                    Edit
                  </button>
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
              <option>Credit Card</option>
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
            <span className="font-semibold">{selectedAccount?.name}</span>.
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
              <option>Credit Card</option>
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
