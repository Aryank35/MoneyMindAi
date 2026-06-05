import {
  FiHome,
  FiDollarSign,
  FiTarget,
  FiHeart,
  FiTrendingUp,
  FiBarChart2,
  FiCreditCard,
} from "react-icons/fi";

export const SIDEBAR_MENU = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: FiHome,
  },
  {
    label: "Expenses",
    path: "/expenses",
    icon: FiDollarSign,
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
    label: "Goals",
    path: "/goals",
    icon: FiTarget,
  },
  {
    label: "Wishlist",
    path: "/wishlist",
    icon: FiHeart,
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
];
