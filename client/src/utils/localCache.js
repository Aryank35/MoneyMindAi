// =========================================================================
// LAST-KNOWN-GOOD CACHE
//
// Reference data the entry forms need - accounts, budget categories - is
// kept here so a form is usable on the very first paint, before the API has
// answered. Without it a cold start leaves nothing to select and the offline
// queue can never be reached.
//
// Deliberately has no expiry. Stale account names are far better than an
// unusable form; the real data overwrites this the moment it arrives.
// =========================================================================

const PREFIX = "moneymind.cache.";

export const readCache = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(PREFIX + key);

    if (!raw) return fallback;

    const parsed = JSON.parse(raw);

    return parsed?.value ?? fallback;
  } catch {
    // Private windows and blocked site data throw. A missing cache is not an
    // error - it just means there is nothing to show yet.
    return fallback;
  }
};

export const writeCache = (key, value) => {
  try {
    localStorage.setItem(
      PREFIX + key,
      JSON.stringify({ value, savedAt: new Date().toISOString() }),
    );

    return true;
  } catch {
    return false;
  }
};

export const cacheAge = (key) => {
  try {
    const raw = localStorage.getItem(PREFIX + key);

    if (!raw) return null;

    const parsed = JSON.parse(raw);

    return parsed?.savedAt ? new Date(parsed.savedAt) : null;
  } catch {
    return null;
  }
};

export const clearCache = () => {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    // Nothing to do - the cache is best-effort by design.
  }
};

// Keys are namespaced per user so switching accounts on a shared device does
// not show someone else's account names.
export const cacheKey = (userId, name) => `${userId || "anon"}.${name}`;
