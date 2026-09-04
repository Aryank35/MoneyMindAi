import { useState } from "react";
import {
  useNavigate,
  Link,
} from "react-router-dom";
import { loginUser } from "../services/authService";
import { FiEye, FiEyeOff } from "react-icons/fi";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Logo from "../components/common/Logo";
import { useToast } from "../components/common/Toast";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const navigate = useNavigate();
  const toast = useToast();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});

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

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      nextErrors.email = "Enter a valid email address";
    }

    if (!formData.password.trim()) {
      nextErrors.password = "Password is required";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!validate()) {
      toast.error(
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

      toast.error(
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
            <Logo size="lg" />
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
            <fieldset disabled={loading} className="space-y-5 border-0 p-0 m-0">
              <Input
                type="email"
                name="email"
                label="Email Address"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email Address"
                error={errors.email}
              />

              <div>
                <div className="relative">
                  <Input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    label="Password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    error={errors.password}
                    className="pr-11"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    aria-label="Toggle password visibility"
                    className="absolute right-4 top-9.5 text-slate-400"
                  >
                    {showPassword ? (
                      <FiEyeOff />
                    ) : (
                      <FiEye />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                loading={loading}
                className="w-full"
                size="lg"
              >
                Login
              </Button>
            </fieldset>
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
