// service-worker.js
//
// Deliberately minimal. Its only job is to make the app installable
// ("Add to Home Screen") on Android/Chrome, which requires an active
// service worker with a fetch handler present.
//
// It does NOT cache app code/JS bundles. This app deploys frequently —
// an aggressive cache-first strategy here would risk people getting stuck
// on a stale build after a deploy, with no obvious way to tell. Every
// request just passes straight through to the network, same as if no
// service worker existed at all, except it satisfies the installability
// requirement.
//
// If true offline support is wanted later, this is the file to build
// that into — a network-first (not cache-first) strategy for the app
// shell would be the safe way to do it.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass-through — no caching. Presence of this handler is what satisfies
  // the installability requirement.
  event.respondWith(fetch(event.request));
});
