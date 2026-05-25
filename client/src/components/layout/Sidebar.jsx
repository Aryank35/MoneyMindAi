import { NavLink } from "react-router-dom";
import { SIDEBAR_MENU } from "../../constants/sidebarMenu";

export default function Sidebar({
  closeSidebar,
}) {
  return (
    <aside
      className="
        w-[260px]
        h-screen
        bg-slate-950
        border-r
        border-slate-800
        p-6
      "
    >
      <div className="space-y-3">
        {SIDEBAR_MENU.map(
          (item) => {
            const Icon =
              item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={
                  closeSidebar
                }
                className={({
                  isActive,
                }) =>
                  `flex items-center gap-3 p-3 rounded-xl transition ${isActive
                    ? "bg-indigo-500/20 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                <Icon size={20} />

                {item.label}
              </NavLink>
            );
          }
        )}
      </div>
    </aside>
  );
}