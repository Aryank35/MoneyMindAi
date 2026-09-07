import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Registered after load so it never competes with the first paint. Only in
// production - in dev it would serve stale modules and fight Vite's HMR.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      // A blocked or unsupported worker costs the offline shell, nothing more.
      console.warn("Service worker registration failed:", error);
    });
  });
}
