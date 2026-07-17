// Numbersong service worker — makes the installed app boot and run with ZERO
// internet after one successful load. The VERSION string is injected at build
// time (build.sh replaces 20260717205849), so every deploy makes a fresh cache
// and students automatically pick up the new build on their next launch.
const VERSION = "20260717205849";
const CACHE = "numbersong-" + VERSION;
const SHELL = ["./", "./index.html", "./manifest.json", "./icon.png"];

self.addEventListener("install", (event) => {
  // Pre-cache the whole app shell (index.html already has everything inlined),
  // then take over immediately instead of waiting for old tabs to close.
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  // Drop caches from older builds so a new deploy fully replaces the old shell.
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;

  if (sameOrigin) {
    // App shell: NETWORK-FIRST so an online reload always gets the freshest deploy
    // (no stale-cache lag), but fall back to the cached shell when offline so the
    // installed app still boots with zero internet.
    event.respondWith(
      fetch(req).then((res) => {
        // Only cache a genuine success — a transient 404/5xx must never overwrite
        // the good cached shell, or the app could boot into an error page offline.
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
    );
  } else {
    // Cross-origin piano samples (tonejs.github.io): serve from cache if present,
    // otherwise fetch and cache on success — so the *sampled* piano becomes
    // available offline after one online session. Best-effort: if the response
    // is opaque/uncacheable or the network fails offline, Tone falls back to the
    // built-in synth piano, so the app still works either way.
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        });
      })
    );
  }
});
