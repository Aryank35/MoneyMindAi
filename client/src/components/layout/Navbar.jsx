import { FiBell, FiMenu, FiLogOut, FiChevronDown } from "react-icons/fi";

import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Logo from "../common/Logo";
import { getHealthLabel, getHealthTone } from "../../utils/financialHealth";

export default function Navbar({ onMenuClick, health }) {
  const navigate = useNavigate();

  const [showProfile, setShowProfile] = useState(false);

  const profileRef = useRef(null);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const firstName = user?.name?.split(" ")[0] || "User";

  const currentHour = new Date().getHours();

  const greeting =
    currentHour < 12
      ? "Good Morning ☀️"
      : currentHour < 18
        ? "Good Afternoon 🌤️"
        : "Good Evening 🌙";

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const healthTone = getHealthTone(health?.score, health?.hasData);

  const healthLabel = getHealthLabel(health?.score, health?.hasData);

  // Click-outside-to-close for the profile dropdown.
  useEffect(() => {
    if (!showProfile) return undefined;

    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfile]);

  return (
    <header
      className="
        fixed
        top-0
        left-0
        right-0
        z-50

        h-[var(--nav-h)]

        backdrop-blur-xl
        bg-slate-950/80

        border-b
        border-slate-800

        flex
        items-center
        justify-between

        px-4
        lg:px-8
      "
    >
      {/* Left */}

      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          aria-label="Toggle menu"
          className="
            lg:hidden
            text-white
          "
        >
          <FiMenu size={24} />
        </button>

        <Logo size="md" />

        <div>
          <h1
            className="
              text-xl
              lg:text-2xl
              font-bold
              text-white
            "
          >
            MoneyMind AI
          </h1>

          <p className="text-xs text-slate-400">Smart Finance Companion</p>
        </div>
      </div>

      {/* Right */}

      <div className="flex items-center gap-4">
        {/* Date */}

        <div className="hidden xl:block text-right">
          <p className="text-white text-sm">{greeting}</p>

          <p className="text-slate-400 text-xs">{today}</p>
        </div>

        {/* Health */}

        {health && (
          <div
            className={`
              hidden
              md:flex

              items-center
              gap-2

              px-3
              py-2

              rounded-xl

              ${healthTone.bg}
              border
              ${healthTone.border}
            `}
          >
            <div className={`w-2 h-2 rounded-full ${healthTone.dot}`} />

            <span className={`text-xs ${healthTone.text}`}>
              {healthLabel}
            </span>
          </div>
        )}

        {/* Notification */}

        <button
          aria-label="View notifications"
          className="
            relative

            w-11
            h-11

            rounded-xl

            bg-slate-900

            flex
            items-center
            justify-center

            hover:bg-slate-800
          "
        >
          <FiBell size={20} className="text-white" />

          <span
            className="
              absolute
              top-2
              right-2

              w-2
              h-2

              bg-red-500
              rounded-full
            "
          />
        </button>

        {/* Profile */}

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            aria-label="Open profile menu"
            aria-expanded={showProfile}
            className="
              flex
              items-center
              gap-3
            "
          >
            <div
              className="
                w-11
                h-11

                rounded-full

                bg-gradient-to-r
                from-indigo-500
                to-purple-500

                flex
                items-center
                justify-center

                font-bold
                text-white
              "
            >
              {firstName.charAt(0)}
            </div>

            <div className="hidden md:block text-left">
              <p className="text-white text-sm">{firstName}</p>

              <p className="text-slate-400 text-xs">Premium User</p>
            </div>

            <FiChevronDown
              aria-hidden="true"
              className="
                text-slate-400
                hidden
                md:block
              "
            />
          </button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="
                  absolute
                  right-0
                  mt-3

                  w-52

                  bg-slate-900
                  border
                  border-slate-700

                  rounded-2xl

                  shadow-2xl

                  overflow-hidden
                "
              >
                <button
                  onClick={handleLogout}
                  className="
                    w-full

                    flex
                    items-center
                    gap-3

                    px-4
                    py-3

                    text-red-400

                    hover:bg-slate-800
                  "
                >
                  <FiLogOut />
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
