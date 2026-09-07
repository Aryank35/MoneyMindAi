/* =========================================================================
   SERVICE WORKER

   Purpose is the app *shell*, not the data. The shell is cached so opening
   the installed app paints immediately instead of waiting on a possibly
   sleeping API - which is what made cold starts feel broken.

   API responses are deliberately never cached: showing a stale balance is
   worse than showing a loading state. Pending writes are handled by the
   outbox in src/utils/offlineQueue.js instead.

   Hand-rolled rather than generated, so there is no build-plugin dependency
   and no precache manifest to keep in step with Vite's hashed filenames.
   ========================================================================= */

const VERSION = "v1";
const SHELL_CACHE = `moneymind-shell-${VERSION}`;
const ASSET_CACHE = `moneymind-assets-${VERSION}`;

// Only what is needed to render something useful on first paint.
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // addAll fails the whole install if any single entry 404s, so each is
      // added independently.
      .then((cache) =>
        Promise.all(
          SHELL.map((url) => cache.add(url).catch(() => undefined)),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

const isAsset = (url) =>
  url.pathname.startsWith("/assets/") ||
  /\.(?:css|js|svg|png|jpg|jpeg|webp|woff2?)$/.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never intercept the API or anything cross-origin (fonts, CDNs).
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: serve the cached shell straight away, refresh it in the
  // background. This is what makes the installed app open instantly.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);

        const fresh = fetch(request)
          .then((response) => {
            if (response.ok) cache.put("/index.html", response.clone());

            return response;
          })
          .catch(() => undefined);

        const cached = await cache.match("/index.html");

        // An SPA serves every route from index.html, so this is safe for
        // /dashboard, /cards and the rest.
        return cached || (await fresh) || Response.error();
      })(),
    );

    return;
  }

  // Build output is content-hashed, so a cache hit can be trusted.
  if (isAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const cached = await cache.match(request);

        if (cached) return cached;

        try {
          const response = await fetch(request);

          if (response.ok) cache.put(request, response.clone());

          return response;
        } catch {
          return Response.error();
        }
      })(),
    );
  }
});
