import { NavLink } from "react-router-dom";
import { SIDEBAR_MENU } from "../../constants/sidebarMenu";

export default function Sidebar({ closeSidebar }) {
  return (
    <aside
      className="
    w-[280px]
    h-screen

    bg-slate-950

    border-r
    border-slate-800

    flex
    flex-col

    overflow-hidden
  "
    >
      {/* Logo */}

      <div
        className="
          p-6
          border-b
          border-slate-800
          flex
          items-center
          gap-4
        "
      >
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
          <h2 className="font-bold text-lg text-white">MoneyMind AI</h2>

          <p className="text-xs text-slate-400">Smart Finance Tracker</p>
        </div>
      </div>

      {/* Navigation */}

      <div
        className="
          flex-1
          overflow-y-auto
          p-4
          custom-scrollbar
        "
      >
        <div className="space-y-2">
          {SIDEBAR_MENU.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `
                    group
                    relative
                    flex
                    items-center
                    gap-4
                    p-4
                    rounded-2xl
                    transition-all
                    duration-300
                    ${
                      isActive
                        ? `
                          bg-gradient-to-r
                          from-indigo-500/20
                          to-purple-500/20
                          text-white
                          border
                          border-indigo-500/30
                        `
                        : `
                          text-slate-400
                          hover:bg-slate-800
                          hover:text-white
                        `
                    }
                  `
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div
                        className="
                            absolute
                            left-0
                            top-2
                            bottom-2
                            w-1
                            rounded-full
                            bg-indigo-500
                          "
                      />
                    )}

                    <Icon
                      size={22}
                      className="
                          group-hover:scale-110
                          transition-all
                        "
                    />

                    <span className="font-medium">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}

      <div
        className="
          p-4
          border-t
          border-slate-800
        "
      >
        <div
          className="
            rounded-2xl
            bg-gradient-to-r
            from-indigo-600
            to-purple-600
            p-4
          "
        >
          <p className="text-xs opacity-80">Financial Health</p>

          <h3 className="text-xl font-bold mt-1">Excellent</h3>

          <div className="mt-3">
            <div className="w-full h-2 bg-white/20 rounded-full">
              <div
                className="
                  h-2
                  rounded-full
                  bg-white
                  w-[75%]
                "
              />
            </div>

            <p className="text-xs mt-2">75% Score</p>
          </div>
        </div>
      </div>

      {/* User Section */}

      <div
        className="
          p-4
          border-t
          border-slate-800
        "
      >
        <div
          className="
            flex
            items-center
            gap-3
            p-3
            rounded-2xl
            bg-slate-900
          "
        >
          <div
            className="
              w-12
              h-12
              rounded-full
              bg-gradient-to-r
              from-pink-500
              to-purple-500
              flex
              items-center
              justify-center
              font-bold
            "
          >
            A
          </div>

          <div>
            <h4 className="font-semibold text-white">Aryan</h4>

            <p className="text-xs text-slate-400">Premium User</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
