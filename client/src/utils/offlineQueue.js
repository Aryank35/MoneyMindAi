// =========================================================================
// OUTBOX
//
// Holds mutations the user made while the API was unreachable, and replays
// them once it answers. Deliberately generic: a caller registers a handler
// per kind, so any future form can queue without changing this file.
//
// localStorage rather than IndexedDB - the payloads are small, and a
// synchronous read means a queued entry can be rendered on first paint
// without an await.
// =========================================================================

const KEY = "moneymind.outbox.v1";

const read = () => {
  try {
    const raw = localStorage.getItem(KEY);

    return raw ? JSON.parse(raw) : [];
  } catch {
    // Private windows and blocked site data both throw here. A missing
    // outbox is not an error - it just means nothing is pending.
    return [];
  }
};

const write = (items) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));

    return true;
  } catch {
    return false;
  }
};

const listeners = new Set();

const notify = () => {
  const items = read();

  listeners.forEach((listener) => listener(items));
};

export const subscribeToOutbox = (listener) => {
  listeners.add(listener);

  listener(read());

  return () => listeners.delete(listener);
};

export const listQueued = (kind) => {
  const items = read();

  return kind ? items.filter((item) => item.kind === kind) : items;
};

export const queuedCount = () => read().length;

// Returns the stored entry so the caller can show it optimistically.
export const enqueue = (kind, payload, meta = {}) => {
  const entry = {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind,
    payload,
    meta,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };

  const items = read();

  items.push(entry);

  if (!write(items)) return null;

  notify();

  return entry;
};

export const removeQueued = (id) => {
  write(read().filter((item) => item.id !== id));

  notify();
};

export const clearQueue = () => {
  write([]);

  notify();
};

// Replays everything in order. Nothing is ever discarded automatically:
// this queue holds money the user has already recorded, and losing it
// silently would be worse than any amount of retrying.
//
// A 4xx means the server will never accept the payload as-is, so the entry
// is marked `blocked` - flush stops retrying it, and the UI shows the reason
// with a discard action so the decision stays with the user.
export const flushQueue = async (handlers) => {
  const items = read();

  if (items.length === 0) return { sent: 0, failed: 0, blocked: 0 };

  let sent = 0;
  let failed = 0;
  const remaining = [];

  for (const entry of items) {
    if (entry.blocked) {
      remaining.push(entry);
      continue;
    }

    const handler = handlers[entry.kind];

    if (!handler) {
      // Nothing knows how to send this - keep it rather than dropping it.
      remaining.push(entry);
      failed += 1;
      continue;
    }

    try {
      await handler(entry.payload, entry);
      sent += 1;
    } catch (error) {
      const status = error?.response?.status;
      const rejected = status >= 400 && status < 500;

      remaining.push({
        ...entry,
        attempts: entry.attempts + 1,
        blocked: rejected,
        lastError: error?.response?.data?.message || error.message,
      });

      failed += 1;
    }
  }

  write(remaining);
  notify();

  return {
    sent,
    failed,
    blocked: remaining.filter((entry) => entry.blocked).length,
  };
};

// Entries the server refused, awaiting the user's decision.
export const listBlocked = () => read().filter((entry) => entry.blocked);
