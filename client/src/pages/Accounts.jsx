import { useEffect, useState } from "react";

import {
  createAccount,
  getAccountsByUser,
  deleteAccount,
  updateAccount,
} from "../services/accountService";

import { getUserId } from "../utils/auth";
import DashboardLayout from "../components/layout/DashboardLayout";

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedAccount, setSelectedAccount] = useState(null);

  const [deleteText, setDeleteText] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);

  const [editingAccount, setEditingAccount] = useState(null);

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
    loadAccounts();
  }, []);

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.balance) {
        alert("Please fill all fields");
        return;
      }

      const payload = {
        ...formData,
        balance: Number(formData.balance),
        userId: getUserId(),
      };

      console.log("Creating Account:", payload);

      const response = await createAccount(payload);

      console.log("Account Created:", response);

      setFormData({
        name: "",
        type: "Bank",
        balance: "",
      });

      setShowCreateModal(false);

      await loadAccounts();
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data?.message ||
          error.message ||
          "Failed to create account",
      );
    }
  };

  const handleDelete = async () => {
    if (deleteText !== "DELETE") return;

    await deleteAccount(selectedAccount._id);

    setDeleteText("");

    setSelectedAccount(null);

    setShowDeleteModal(false);

    loadAccounts();
  };

  const handleUpdate = async () => {
    try {
      if (!editingAccount) return;

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
    } catch (error) {
      console.error(error);

      alert(error?.response?.data?.message || "Failed to update account");
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

        <button
          onClick={() => setShowCreateModal(true)}
          className="
    mb-8
    px-5
    py-3
    rounded-xl
    bg-indigo-600
    hover:bg-indigo-700
    font-semibold
  "
        >
          + Add Account
        </button>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {accounts.map((account) => {
            const theme = accountThemes[account.type] || accountThemes.Bank;

            const allocation =
              totalAssets > 0
                ? ((Number(account.balance) / totalAssets) * 100).toFixed(1)
                : 0;

            return (
              <div
                key={account._id}
                className={`
            relative
            overflow-hidden
            rounded-3xl
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
                  className="
    mt-6
              w-full
              py-2
              rounded-xl
              bg-red-500/20
              text-red-200
  "
                >
                  Edit
                </button>
              </div>
            );
          })}
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-slate-900 p-6 rounded-3xl w-full max-w-md">
              <h2 className="text-2xl font-bold mb-5">Create Account</h2>

              <div className="space-y-4">
                <input
                  placeholder="Account Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                    })
                  }
                  className="w-full bg-slate-800 p-3 rounded-xl"
                />

                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value,
                    })
                  }
                  className="w-full bg-slate-800 p-3 rounded-xl"
                >
                  <option>Bank</option>
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Wallet</option>
                  <option>Credit Card</option>
                </select>

                <input
                  type="number"
                  placeholder="Opening Balance"
                  value={formData.balance}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      balance: e.target.value,
                    })
                  }
                  className="w-full bg-slate-800 p-3 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-700 rounded-xl"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-indigo-600 rounded-xl"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-slate-900 p-6 rounded-3xl w-full max-w-md">
              <h2 className="text-2xl font-bold text-red-400">
                Delete Account
              </h2>

              <p className="mt-4 text-slate-300">Type DELETE to confirm.</p>

              <input
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                className="w-full mt-4 bg-slate-800 p-3 rounded-xl"
              />

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setDeleteText("");

                    setShowDeleteModal(false);
                  }}
                  className="px-4 py-2 bg-slate-700 rounded-xl"
                >
                  Cancel
                </button>

                <button
                  disabled={deleteText !== "DELETE"}
                  onClick={handleDelete}
                  className="
            px-4
            py-2
            rounded-xl
            bg-red-600
            disabled:opacity-40
          "
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-slate-900 p-6 rounded-3xl w-full max-w-md">
              <h2 className="text-2xl font-bold mb-5">Edit Account</h2>

              <div className="space-y-4">
                <input
                  placeholder="Account Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                    })
                  }
                  className="w-full bg-slate-800 p-3 rounded-xl"
                />

                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value,
                    })
                  }
                  className="w-full bg-slate-800 p-3 rounded-xl"
                >
                  <option>Bank</option>
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Wallet</option>
                  <option>Credit Card</option>
                </select>

                <input
                  type="number"
                  placeholder="Balance"
                  value={formData.balance}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      balance: e.target.value,
                    })
                  }
                  className="w-full bg-slate-800 p-3 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingAccount(null);
                  }}
                  className="px-4 py-2 bg-slate-700 rounded-xl"
                >
                  Cancel
                </button>

                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 bg-emerald-600 rounded-xl"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
