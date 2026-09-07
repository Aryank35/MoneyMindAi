import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  flushQueue,
  queuedCount,
  subscribeToOutbox,
} from "../utils/offlineQueue";
import { createExpense } from "../services/expenseService";
import { ConnectionContext } from "./connectionContext";

const HEALTH_URL = `${import.meta.env.VITE_API_URL}/health`;

// Render's free tier stops the instance after inactivity; the first request
// then has to boot it. Past this point the UI stops saying "connecting" and
// starts explaining that the server is waking, so a long wait reads as
// expected rather than broken.
const WAKING_AFTER_MS = 3500;

// How each queued mutation gets replayed. Adding a queueable form means
// adding one entry here.
const OUTBOX_HANDLERS = {
  "expense.create": (payload) => createExpense(payload),
};

export function ConnectionProvider({ children }) {
  const [status, setStatus] = useState(
    navigator.onLine ? "connecting" : "offline",
  );
  const [elapsed, setElapsed] = useState(0);
  const [pending, setPending] = useState(queuedCount);

  const attemptRef = useRef(0);
  const timerRef = useRef(null);
  const tickRef = useRef(null);

  useEffect(() => subscribeToOutbox((items) => setPending(items.length)), []);

  const probe = useCallback(async () => {
    if (!navigator.onLine) {
      setStatus("offline");

      return false;
    }

    try {
      // A plain fetch rather than the axios instance: no auth header, no
      // interceptors, and it must not be blocked by an in-flight request.
      const response = await fetch(HEALTH_URL, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) throw new Error(String(response.status));

      setStatus("online");
      attemptRef.current = 0;

      return true;
    } catch {
      attemptRef.current += 1;

      return false;
    }
  }, []);

  // Drain the outbox whenever the API comes back.
  useEffect(() => {
    if (status !== "online" || pending === 0) return;

    let cancelled = false;

    flushQueue(OUTBOX_HANDLERS).then((result) => {
      if (cancelled || result.sent === 0) return;

      // Pages read their data on mount, so tell them to refetch rather than
      // leaving a stale list next to a now-empty outbox.
      window.dispatchEvent(
        new CustomEvent("moneymind:outbox-flushed", { detail: result }),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [status, pending]);

  useEffect(() => {
    let cancelled = false;

    const start = Date.now();

    tickRef.current = window.setInterval(() => {
      setElapsed(Math.round((Date.now() - start) / 1000));
    }, 500);

    const attempt = async () => {
      if (cancelled) return;

      const ok = await probe();

      if (cancelled || ok) {
        window.clearInterval(tickRef.current);

        return;
      }

      // Escalate the wording once a cold start is the likely explanation.
      if (Date.now() - start > WAKING_AFTER_MS) {
        setStatus((prev) => (prev === "offline" ? prev : "waking"));
      }

      // Back off, but keep trying - a cold Render instance can take most of
      // a minute, and giving up would leave the user stuck.
      const delay = Math.min(1500 * attemptRef.current, 6000);

      timerRef.current = window.setTimeout(attempt, delay);
    };

    attempt();

    const handleOnline = () => {
      attemptRef.current = 0;
      setStatus("connecting");
      attempt();
    };

    const handleOffline = () => setStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cancelled = true;
      window.clearTimeout(timerRef.current);
      window.clearInterval(tickRef.current);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [probe]);

  const retry = useCallback(() => {
    attemptRef.current = 0;
    setStatus("connecting");
    probe();
  }, [probe]);

  const value = useMemo(
    () => ({
      status,
      isReachable: status === "online",
      elapsed,
      pending,
      retry,
    }),
    [status, elapsed, pending, retry],
  );

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}
