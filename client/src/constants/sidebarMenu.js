import {
  FiHome,
  FiDollarSign,
  FiTarget,
  FiHeart,
  FiTrendingUp,
  FiBarChart2,
  FiCreditCard,
  FiRepeat,
  FiLayers,
  FiCalendar,
  FiUsers,
  FiPieChart,
  FiMap,
  FiCheckSquare,
} from "react-icons/fi";

export const SIDEBAR_MENU = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: FiHome,
  },
  {
    label: "Notes",
    path: "/notes",
    icon: FiCheckSquare,
  },
  {
    label: "Expenses",
    path: "/expenses",
    icon: FiDollarSign,
  },
  {
    label: "Transfer",
    path: "/transfer",
    icon: FiRepeat,
  },
  {
    label: "Budget",
    path: "/budget",
    icon: FiTarget,
  },
  {
    label: "Income",
    path: "/income",
    icon: FiDollarSign,
  },
  {
    label: "Pots",
    path: "/pots",
    icon: FiHeart,
  },
  {
    label: "Lending",
    path: "/lending",
    icon: FiUsers,
  },
  {
    label: "Splits",
    path: "/splits",
    icon: FiPieChart,
  },
  {
    label: "Plans",
    path: "/events",
    icon: FiMap,
  },
  {
    label: "Investments",
    path: "/investments",
    icon: FiTrendingUp,
  },
  {
    label: "Analytics",
    path: "/analytics",
    icon: FiBarChart2,
  },
  {
    label: "Accounts",
    path: "/accounts",
    icon: FiCreditCard,
  },
  {
    label: "Cards",
    path: "/cards",
    icon: FiLayers,
  },
  {
    label: "Planner",
    path: "/planner",
    icon: FiCalendar,
  },
];
