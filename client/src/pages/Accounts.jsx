import { useEffect, useState } from "react";

import {
  createAccount,
  getAccountsByUser,
  deleteAccount,
} from "../services/accountService";

import { getUserId } from "../utils/auth";

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    type: "Bank",
    balance: "",
    icon: "💳",
  });

  const loadAccounts = async () => {
    const res = await getAccountsByUser(getUserId());

    setAccounts(res.data || []);
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleSave = async () => {
    await createAccount({
      ...formData,
      balance: Number(formData.balance),
      userId: getUserId(),
    });

    setFormData({
      name: "",
      type: "Bank",
      balance: "",
      icon: "💳",
    });

    loadAccounts();
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl font-bold mb-6">Accounts</h1>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <input
          placeholder="Account Name"
          value={formData.name}
          onChange={(e) =>
            setFormData({
              ...formData,
              name: e.target.value,
            })
          }
          className="bg-slate-800 p-3 rounded-xl"
        />

        <select
          value={formData.type}
          onChange={(e) =>
            setFormData({
              ...formData,
              type: e.target.value,
            })
          }
          className="bg-slate-800 p-3 rounded-xl"
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
          className="bg-slate-800 p-3 rounded-xl"
        />

        <button onClick={handleSave} className="bg-indigo-600 rounded-xl">
          Add Account
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {accounts.map((account) => (
          <div
            key={account._id}
            className="
                bg-gradient-to-br
                from-indigo-500/20
                to-purple-500/20
                border
                border-white/10
                rounded-3xl
                p-5
              "
          >
            <div className="text-4xl">{account.icon}</div>

            <h2 className="text-xl font-bold mt-3">{account.name}</h2>

            <p className="text-slate-400">{account.type}</p>

            <h3 className="text-3xl font-bold mt-4">
              ₹{account.balance.toLocaleString()}
            </h3>

            <button
              onClick={async () => {
                await deleteAccount(account._id);

                loadAccounts();
              }}
              className="mt-4 text-red-400"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
