import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };

const body = `
// FreeEarnHub Service Worker (PWA shell + Firebase background push)
const CACHE_NAME = "earnhub-shell-v1";
const OFFLINE_URL = "/offline";
const SHELL_ASSETS = ["/", OFFLINE_URL, "/manifest.webmanifest", "/icons/icon-192.svg", "/icons/icon-512.svg"];
const FIREBASE_CONFIG = ${JSON.stringify(config)};
const PUSH_CONFIGURED = Boolean(
  FIREBASE_CONFIG.apiKey &&
  FIREBASE_CONFIG.authDomain &&
  FIREBASE_CONFIG.projectId &&
  FIREBASE_CONFIG.storageBucket &&
  FIREBASE_CONFIG.messagingSenderId &&
  FIREBASE_CONFIG.appId
);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const offline = await cache.match(OFFLINE_URL);
        return offline || Response.error();
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && request.url.startsWith(self.location.origin)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached || Response.error());
    })
  );
});

if (PUSH_CONFIGURED) {
  try {
    importScripts("https://www.gstatic.com/firebasejs/12.10.0/firebase-app-compat.js");
    importScripts("https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging-compat.js");

    if (self.firebase?.initializeApp) {
      self.firebase.initializeApp(FIREBASE_CONFIG);
      const messaging = self.firebase.messaging();

      messaging.onBackgroundMessage((payload) => {
        const title = payload.notification?.title || "FreeEarnHub update";
        const options = {
          body: payload.notification?.body || "You have a new notification.",
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          data: payload.data || {},
        };

        self.registration.showNotification(title, options);
      });
    }
  } catch (error) {
    // Keep the shell/offline worker active even if push bootstrap fails on this browser.
    console.warn("Firebase messaging is unavailable in this service worker.", error);
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification?.data?.link || "/";
  event.waitUntil(clients.openWindow(target));
});
`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

