import { useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  FiEye,
  FiEyeOff,
} from "react-icons/fi";

import { registerUser } from "../services/authService";

export default function Signup() {
  const navigate =
    useNavigate();

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [formData, setFormData] =
    useState({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    });

  const handleChange = (
    event
  ) => {
    const { name, value } =
      event.target;

    setFormData(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.password.trim() ||
      !formData.confirmPassword.trim()
    ) {
      alert(
        "Please fill all fields"
      );

      return;
    }

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      alert(
        "Passwords do not match"
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await registerUser({
          name: formData.name,
          email:
            formData.email,
          password:
            formData.password,
        });

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
          "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-8">

        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
            M
          </div>
        </div>

        <h1 className="text-center text-4xl font-bold text-white">
          Create Account
        </h1>

        <p className="text-center text-slate-400 mt-3">
          Join MoneyMind AI
        </p>

        <form
          onSubmit={
            handleSubmit
          }
          className="mt-8 space-y-4"
        >
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={
              formData.name
            }
            onChange={
              handleChange
            }
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white"
          />

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={
              formData.email
            }
            onChange={
              handleChange
            }
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white"
          />

          <div className="relative">
            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              name="password"
              placeholder="Password"
              value={
                formData.password
              }
              onChange={
                handleChange
              }
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white"
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

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={
              formData.confirmPassword
            }
            onChange={
              handleChange
            }
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white"
          />

          <button
            type="submit"
            disabled={
              loading
            }
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold"
          >
            {loading
              ? "Creating..."
              : "Create Account"}
          </button>
        </form>

        <p className="text-center text-slate-400 mt-6">
          Already have an account?

          <Link
            to="/"
            className="text-indigo-400 ml-2"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}