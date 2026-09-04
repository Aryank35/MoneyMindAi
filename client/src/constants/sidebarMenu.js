import {
  FiHome,
  FiDollarSign,
  FiTarget,
  FiHeart,
  FiTrendingUp,
  FiBarChart2,
  FiCreditCard,
  FiRepeat,
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
  {
    label: "Transfer",
    path: "/transfer",
    icon: FiRepeat,
  },
];
