/*
 * Guwahati Run service worker.
 *
 * Goal: the app opens and works fully offline (on a train with no signal).
 * - On install, every screen and its JS/CSS is saved to the phone.
 * - Pages: try the network (fresh), fall back to the saved copy when offline.
 * - Build assets (/_next/static) never change, so they're served from cache.
 * - Push notifications (phase 4) are handled here too.
 */

const VERSION = "gr-v1";
const PAGES = ["/", "/timeline", "/tickets", "/money", "/team", "/hackathon"];
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

/** Save each page plus every static asset it references. */
async function precache() {
  const cache = await caches.open(VERSION);
  const assets = new Set(["/manifest.webmanifest", "/icons/192", "/icons/512"]);
  await Promise.all(
    PAGES.map(async (path) => {
      try {
        const res = await fetch(path, { credentials: "same-origin", cache: "no-store" });
        // Skip redirects (e.g. to /login when signed out).
        if (!res.ok || res.redirected) return;
        const html = await res.clone().text();
        await cache.put(path, res);
        for (const m of html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)) assets.add(m[0]);
      } catch {}
    }),
  );
  await Promise.all(
    [...assets].map(async (url) => {
      try {
        const res = await fetch(url, { credentials: "same-origin" });
        if (res.ok) await cache.put(url, res);
      } catch {}
    }),
  );
}

self.addEventListener("message", (event) => {
  // The app asks for a refresh of the offline copy after sign-in or an update.
  if (event.data === "precache") event.waitUntil(precache());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(cacheFirst(req));
    return;
  }

  // React Server Component payloads for in-app navigation. If the network is
  // gone, fail fast; Next.js then does a full page load, which we serve below.
  if (req.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) {
    event.respondWith(fetch(req).catch(() => Response.error()));
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(networkFirstPage(req, url));
  }
});

async function cacheFirst(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req, { ignoreSearch: req.url.includes("/icons/") });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirstPage(req, url) {
  const cache = await caches.open(VERSION);
  try {
    const res = await withTimeout(fetch(req), NETWORK_TIMEOUT_MS);
    if (res.ok && !res.redirected) cache.put(url.pathname, res.clone());
    return res;
  } catch {
    const hit = (await cache.match(url.pathname)) || (await cache.match("/"));
    return (
      hit ||
      new Response("<h1>Offline</h1><p>Open the app once with internet to save it to this phone.</p>", {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    );
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/* ---------------------------------------------------------------- push */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Guwahati Run", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Guwahati Run", {
      body: data.body || "",
      tag: data.tag,
      icon: "/icons/192",
      badge: "/icons/192",
      data: { url: data.url || "/" },
      renotify: !!data.tag,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if ("focus" in c) {
          c.navigate(target);
          return c.focus();
        }
      }
      return self.clients.openWindow(target);
    })(),
  );
});
