import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiCloudOff,
  FiRefreshCw,
  FiUploadCloud,
} from "react-icons/fi";

import { useConnection } from "../../context/connectionContext";

// A cold start on a free-tier host can take most of a minute. Rather than a
// spinner that says nothing, the wait carries something worth reading.
const TIPS = [
  "Aim to keep credit-card utilisation under 30% — it is the single biggest lever on a credit score.",
  "An emergency fund of 6 months' expenses is the difference between a setback and a crisis.",
  "Budget against income you have actually received, not income you expect.",
  "A recurring payment you have forgotten about is the most expensive kind.",
  "Paying a card in full beats paying the minimum by a wide margin — interest compounds daily.",
  "Money lent without a date is a gift with extra steps. Write the date down.",
];

// Cold starts land in the 30-60s range, so the bar is paced to feel honest
// rather than finishing early and then stalling.
const EXPECTED_WAKE_SECONDS = 55;

export default function ConnectionBanner() {
  const { status, elapsed, pending, retry } = useConnection();
  const [tipIndex, setTipIndex] = useState(0);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    if (status !== "waking") return undefined;

    const timer = window.setInterval(
      () => setTipIndex((prev) => (prev + 1) % TIPS.length),
      6000,
    );

    return () => window.clearInterval(timer);
  }, [status]);

  // Confirm a sync happened, then get out of the way.
  useEffect(() => {
    const onFlushed = (event) => {
      if (!event.detail?.sent) return;

      setJustSynced(event.detail.sent);
      window.setTimeout(() => setJustSynced(false), 4000);
    };

    window.addEventListener("moneymind:outbox-flushed", onFlushed);

    return () =>
      window.removeEventListener("moneymind:outbox-flushed", onFlushed);
  }, []);

  const showWaking = status === "waking";
  const showOffline = status === "offline";
  const showSyncing = status === "online" && pending > 0;
  const visible = showWaking || showOffline || showSyncing || justSynced;

  if (!visible) return null;

  const progress = Math.min((elapsed / EXPECTED_WAKE_SECONDS) * 100, 96);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        role="status"
        aria-live="polite"
        className={`mb-5 overflow-hidden rounded-2xl border p-4 ${
          showOffline
            ? "border-amber-400/30 bg-amber-500/10"
            : justSynced
              ? "border-emerald-400/30 bg-emerald-500/10"
              : "border-white/10 bg-slate-900"
        }`}
      >
        {showWaking && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <FiRefreshCw className="animate-spin text-indigo-300" />
                Waking the server
                <span className="font-normal text-slate-400">
                  · {elapsed}s
                </span>
              </p>
              <button
                onClick={retry}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                Retry now
              </button>
            </div>

            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-1 rounded-full bg-indigo-400"
                animate={{ width: `${progress}%` }}
                transition={{ ease: "linear", duration: 0.5 }}
              />
            </div>

            <p className="mt-3 text-xs text-slate-400">
              The free hosting tier sleeps when idle, so the first request has
              to start it. This usually takes under a minute — you can keep
              using the app meanwhile, and anything you enter is saved and
              sent once it answers.
            </p>

            <AnimatePresence mode="wait">
              <motion.p
                key={tipIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-3 border-t border-white/10 pt-3 text-xs text-indigo-200"
              >
                {TIPS[tipIndex]}
              </motion.p>
            </AnimatePresence>
          </>
        )}

        {showOffline && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-start gap-2 text-sm text-amber-200">
              <FiCloudOff className="mt-0.5 shrink-0" />
              <span>
                You are offline.
                <span className="mt-0.5 block text-xs text-amber-200/80">
                  {pending > 0
                    ? `${pending} entr${pending === 1 ? "y is" : "ies are"} saved on this device and will sync automatically.`
                    : "Anything you add is saved here and sent when the connection returns."}
                </span>
              </span>
            </p>
            <button
              onClick={retry}
              className="rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs text-amber-200 transition hover:border-amber-400/50"
            >
              Try again
            </button>
          </div>
        )}

        {showSyncing && !showOffline && (
          <p className="flex items-center gap-2 text-sm text-slate-300">
            <FiUploadCloud className="animate-pulse text-indigo-300" />
            Syncing {pending} saved{" "}
            {pending === 1 ? "entry" : "entries"}…
          </p>
        )}

        {justSynced && !showSyncing && !showOffline && !showWaking && (
          <p className="flex items-center gap-2 text-sm text-emerald-200">
            <FiCheckCircle />
            {justSynced} saved {justSynced === 1 ? "entry" : "entries"} synced.
          </p>
        )}

        {status === "online" && pending > 0 && (
          <p className="mt-2 flex items-start gap-2 text-xs text-slate-500">
            <FiAlertTriangle className="mt-0.5 shrink-0" />
            Keep this tab open until syncing finishes.
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
