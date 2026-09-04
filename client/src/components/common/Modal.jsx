import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiX } from "react-icons/fi";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previouslyFocused = document.activeElement;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();

        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    const firstFocusable = panelRef.current?.querySelector(
      "button, input, select, textarea",
    );

    firstFocusable?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              onClose?.();
            }
          }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === "string" ? title : undefined}
            className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl custom-scrollbar`}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
          >
            {title && (
              <div className="flex items-center justify-between mb-5 gap-4">
                <h2 className="text-xl font-semibold">{title}</h2>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="rounded-lg bg-slate-800 hover:bg-slate-700 p-2 transition-colors shrink-0"
                >
                  <FiX size={18} />
                </button>
              </div>
            )}

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
