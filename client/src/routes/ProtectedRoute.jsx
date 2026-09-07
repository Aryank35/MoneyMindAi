import { Navigate, useLocation } from "react-router-dom";

import { getToken } from "../utils/auth";

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!getToken()) {
    // "/login" resolves to the landing route. `state` carries where the user
    // was headed so a sign-in can return them there.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
