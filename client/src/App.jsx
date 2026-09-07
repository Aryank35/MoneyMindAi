import AppRoutes from "./routes/AppRoutes";
import { ToastProvider } from "./components/common/Toast";
import { ConnectionProvider } from "./context/ConnectionProvider";

function App() {
  return (
    <ToastProvider>
      {/* Wraps the router so every page shares one reachability probe and
          one outbox, rather than each re-discovering the server is asleep. */}
      <ConnectionProvider>
        <AppRoutes />
      </ConnectionProvider>
    </ToastProvider>
  );
}

export default App;
