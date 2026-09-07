import { createContext, useContext } from "react";

// Kept apart from ConnectionProvider.jsx so that file exports only a
// component - a file mixing components with other exports breaks React fast
// refresh during development.
export const ConnectionContext = createContext({
  status: "connecting",
  isReachable: false,
  elapsed: 0,
  pending: 0,
  retry: () => {},
});

export const useConnection = () => useContext(ConnectionContext);
