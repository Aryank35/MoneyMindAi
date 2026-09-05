import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiX } from "react-icons/fi";

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}) {
  const panelRef = useRef(null);

  // Every caller passes an inline arrow for onClose, so its identity changes
  // on each parent render. Keeping it in a ref lets the effect below depend
  // on isOpen alone - with onClose in the dependency array, typing a single
  // character re-ran the whole effect and pulled focus out of the field.
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return undefined;

    const previouslyFocused = document.activeElement;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onCloseRef.current?.();

        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = panelRef.current.querySelectorAll(FOCUSABLE);

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

    // Land on the first real field. The close button comes first in DOM
    // order, so querying focusables generically would focus that instead.
    const panel = panelRef.current;

    const firstField = panel?.querySelector(
      "input:not([type='hidden']), select, textarea",
    );

    (firstField || panel?.querySelector("button"))?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
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
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold tracking-tight">{title}</h2>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="shrink-0 rounded-lg bg-slate-800 p-2 transition-colors hover:bg-slate-700"
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
