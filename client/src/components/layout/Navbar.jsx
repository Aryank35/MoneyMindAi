import {
  FiBell,
  FiMenu,
  FiLogOut,
  FiSearch,
  FiChevronDown,
} from "react-icons/fi";

import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Navbar({ onMenuClick }) {
  const navigate = useNavigate();

  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const user = JSON.parse(localStorage.getItem("user"));

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

  return (
    <header
      className="
        fixed
        top-0
        left-0
        right-0
        z-50

        h-20

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
          className="
            lg:hidden
            text-white
          "
        >
          <FiMenu size={24} />
        </button>

        <div
          className="
            w-12
            h-12
            rounded-2xl

            bg-gradient-to-r
            from-indigo-500
            via-purple-500
            to-pink-500

            flex
            items-center
            justify-center

            text-xl
          "
        >
          💰
        </div>

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

      {/* Center Search */}

      <div
        className="
          hidden
          lg:flex

          items-center

          bg-slate-900
          border
          border-slate-700

          rounded-2xl

          px-4
          py-2

          w-[350px]
        "
      >
        <FiSearch className="text-slate-500" />

        <input
          placeholder="Search expenses, accounts..."
          className="
            bg-transparent
            outline-none
            px-3
            w-full
            text-white
          "
        />
      </div>

      {/* Right */}

      <div className="flex items-center gap-4">
        {/* Date */}

        <div className="hidden xl:block text-right">
          <p className="text-white text-sm">{greeting}</p>

          <p className="text-slate-400 text-xs">{today}</p>
        </div>

        {/* Health */}

        <div
          className="
            hidden
            md:flex

            items-center
            gap-2

            px-3
            py-2

            rounded-xl

            bg-emerald-500/10
            border
            border-emerald-500/20
          "
        >
          <div
            className="
              w-2
              h-2
              rounded-full
              bg-emerald-500
            "
          />

          <span
            className="
              text-xs
              text-emerald-400
            "
          >
            Healthy Budget
          </span>
        </div>

        {/* Notification */}

        <button
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

        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
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
              className="
                text-slate-400
                hidden
                md:block
              "
            />
          </button>

          {showProfile && (
            <div
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
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
