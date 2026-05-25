import { useState } from "react";
import {
  useNavigate,
  Link,
} from "react-router-dom";
import { loginUser } from "../services/authService";
import { FcGoogle } from "react-icons/fc";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (
      !formData.email.trim() ||
      !formData.password.trim()
    ) {
      alert(
        "Please fill all fields"
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await loginUser(
          formData
        );

      localStorage.setItem(
        "token",
        response.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(
          response.user
        )
      );

      navigate(
        "/dashboard"
      );
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data
          ?.message ||
        "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute -left-32 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px]" />

      <div className="absolute -right-20 top-40 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-[120px]" />

      {/* Left Section */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center">
        <div className="relative z-10 max-w-xl px-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm mb-8">
            🚀 AI Powered Financial Management
          </div>

          <h1 className="text-6xl font-bold leading-tight">
            <span className="text-white">
              Take Control of
            </span>

            <br />

            <span className="bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
              Your Financial Future
            </span>
          </h1>

          <p className="text-slate-400 text-lg mt-8 leading-relaxed">
            Track expenses, manage budgets,
            monitor investments, plan goals and
            receive AI powered financial insights
            in one place.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-10">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/10 hover:border-indigo-500/30 hover:scale-105 transition-all duration-300">
              <p className="text-slate-400 text-sm">
                Monthly Savings
              </p>

              <h3 className="text-white text-2xl font-bold mt-2">
                ₹18,400
              </h3>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/10 hover:border-indigo-500/30 hover:scale-105 transition-all duration-300">
              <p className="text-slate-400 text-sm">
                Investments
              </p>

              <h3 className="text-green-400 text-2xl font-bold mt-2">
                +12.4%
              </h3>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/10 hover:border-indigo-500/30 hover:scale-105 transition-all duration-300">
              <p className="text-slate-400 text-sm">
                Budget Utilized
              </p>

              <h3 className="text-yellow-400 text-2xl font-bold mt-2">
                62%
              </h3>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/10 hover:border-indigo-500/30 hover:scale-105 transition-all duration-300">
              <p className="text-slate-400 text-sm">
                Goals Completed
              </p>

              <h3 className="text-cyan-400 text-2xl font-bold mt-2">
                8
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-purple-500/20">
              M
            </div>
          </div>

          <h2 className="text-5xl font-bold text-white text-center">
            MoneyMind AI
          </h2>

          <p className="text-center text-slate-400 mt-3">
            Manage your finances smarter and
            achieve your goals.
          </p>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email Address"
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none transition-all duration-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />

            <div className="relative">
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none transition-all duration-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPassword ? (
                  <FiEyeOff />
                ) : (
                  <FiEye />
                )}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="text-indigo-400 text-sm hover:text-indigo-300"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50"
            >
              {loading
                ? "Signing In..."
                : "Login"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px bg-slate-700 flex-1"></div>

              <span className="text-slate-500 text-sm">
                OR
              </span>

              <div className="h-px bg-slate-700 flex-1"></div>
            </div>

            {/* Google Login */}
            <button
              type="button"
              className="w-full py-3 rounded-xl border border-slate-700 text-white hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-3"
            >
              <FcGoogle size={22} />
              Continue with Google
            </button>
          </form>

          <p className="text-center text-slate-400 mt-6">
            Don't have an account?
            <Link
              to="/signup"
              className="text-indigo-400 ml-2 hover:text-indigo-300"
            >
              Create Account
            </Link>
          </p>

          <p className="text-center text-xs text-slate-500 mt-8">
            Secure • Private • AI Powered
          </p>
        </div>
      </div>
    </div>
  );
}