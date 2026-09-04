import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from "react-icons/fi";

const ToastContext = createContext(null);

const ICONS = {
  success: FiCheckCircle,
  error: FiAlertCircle,
  info: FiInfo,
};

const COLORS = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  error: "border-red-500/30 bg-red-500/10 text-red-300",
  info: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toastItem) => toastItem.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = "info", duration = 4000) => {
      const id = `${Date.now()}-${Math.random()}`;

      setToasts((prev) => [...prev, { id, message, type }]);

      if (duration) {
        setTimeout(() => removeToast(id), duration);
      }

      return id;
    },
    [removeToast],
  );

  const toast = {
    success: (message, duration) => showToast(message, "success", duration),
    error: (message, duration) => showToast(message, "error", duration),
    info: (message, duration) => showToast(message, "info", duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      <div className="fixed bottom-6 right-6 z-100 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map(({ id, message, type }) => {
            const Icon = ICONS[type] || FiInfo;

            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 backdrop-blur-xl shadow-2xl bg-slate-900/95 ${COLORS[type] || COLORS.info}`}
                role="status"
              >
                <Icon size={20} className="mt-0.5 shrink-0" />

                <p className="flex-1 text-sm text-white">{message}</p>

                <button
                  type="button"
                  onClick={() => removeToast(id)}
                  aria-label="Dismiss notification"
                  className="text-slate-400 hover:text-white shrink-0"
                >
                  <FiX size={16} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);

  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return ctx;
}
