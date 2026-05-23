import {
  FiHome,
  FiDollarSign,
  FiTarget,
  FiHeart,
  FiTrendingUp,
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
    label: "Wishlist",
    path: "/wishlist",
    icon: FiHeart,
  },
  {
    label: "Investments",
    path: "/investments",
    icon: FiTrendingUp,
  },
];