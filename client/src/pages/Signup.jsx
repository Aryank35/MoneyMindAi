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
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Logo from "../components/common/Logo";
import { useToast } from "../components/common/Toast";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const navigate =
    useNavigate();

  const toast = useToast();

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

  const [errors, setErrors] =
    useState({});

  const handleChange = (
    event
  ) => {
    const { name, value } =
      event.target;

    const nextFormData = {
      ...formData,
      [name]: value,
    };

    setFormData(nextFormData);

    setErrors((previous) => {
      const nextErrors = {
        ...previous,
        [name]: "",
      };

      // Live confirm-password mismatch check as the user types.
      if (
        name === "password" ||
        name === "confirmPassword"
      ) {
        if (
          nextFormData.confirmPassword &&
          nextFormData.password !==
            nextFormData.confirmPassword
        ) {
          nextErrors.confirmPassword =
            "Passwords do not match";
        } else {
          nextErrors.confirmPassword = "";
        }
      }

      return nextErrors;
    });
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = "Full name is required";
    }

    if (!formData.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      nextErrors.email = "Enter a valid email address";
    }

    if (!formData.password.trim()) {
      nextErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      nextErrors.password =
        "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword.trim()) {
      nextErrors.confirmPassword =
        "Please confirm your password";
    } else if (
      formData.password !==
      formData.confirmPassword
    ) {
      nextErrors.confirmPassword =
        "Passwords do not match";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!validate()) {
      if (
        formData.password &&
        formData.confirmPassword &&
        formData.password !==
          formData.confirmPassword
      ) {
        toast.error(
          "Passwords do not match"
        );
      } else {
        toast.error(
          "Please fill all fields"
        );
      }

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

      toast.error(
        error?.response?.data
          ?.message ||
          "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-5 overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute -left-32 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px]" />

      <div className="absolute -right-20 top-40 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-[120px]" />

      <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

        <div className="flex justify-center mb-4">
          <Logo size="lg" />
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
          <fieldset disabled={loading} className="space-y-4 border-0 p-0 m-0">
            <Input
              type="text"
              name="name"
              label="Full Name"
              placeholder="Full Name"
              value={
                formData.name
              }
              onChange={
                handleChange
              }
              error={errors.name}
            />

            <Input
              type="email"
              name="email"
              label="Email Address"
              placeholder="Email Address"
              value={
                formData.email
              }
              onChange={
                handleChange
              }
              error={errors.email}
            />

            <div className="relative">
              <Input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                name="password"
                label="Password"
                placeholder="Password"
                value={
                  formData.password
                }
                onChange={
                  handleChange
                }
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

            <Input
              type="password"
              name="confirmPassword"
              label="Confirm Password"
              placeholder="Confirm Password"
              value={
                formData.confirmPassword
              }
              onChange={
                handleChange
              }
              error={errors.confirmPassword}
            />

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              Create Account
            </Button>
          </fieldset>
        </form>

        <p className="text-center text-slate-400 mt-6">
          Already have an account?

          <Link
            to="/"
            className="text-indigo-400 ml-2 hover:text-indigo-300"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
