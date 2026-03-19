"use client";

import { useEffect } from "react";
import { onMessage } from "firebase/messaging";
import { getBrowserMessaging, isFirebaseWebConfigured } from "@/lib/firebase-client";

function normalizeLink(link: unknown) {
  if (typeof link !== "string") return "/dashboard";
  const trimmed = link.trim();
  return trimmed.startsWith("/") ? trimmed : "/dashboard";
}

/**
 * FCM web push only auto-displays via the Service Worker when the app is in the background.
 * When the page is in the foreground, we need an explicit onMessage handler if we want a
 * system Notification to appear.
 */
export default function PushForegroundListener() {
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    async function boot() {
      if (!isFirebaseWebConfigured()) return;
      if (!("Notification" in window)) return;
      if (Notification.permission !== "granted") return;

      const messaging = await getBrowserMessaging();
      if (!messaging || cancelled) return;

      unsub = onMessage(messaging, (payload) => {
        try {
          const title = payload.notification?.title || "FreeEarnHub update";
          const body = payload.notification?.body || "You have a new notification.";
          const link = normalizeLink((payload.data as Record<string, unknown> | undefined)?.link);

          const n = new Notification(title, {
            body,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            // Some browsers support Notification.data, but we also keep `link` in closure.
            data: { link },
          });

          n.onclick = (event) => {
            event.preventDefault();
            try {
              window.open(link, "_blank", "noopener,noreferrer");
            } finally {
              n.close();
            }
          };
        } catch {
          // If the OS blocks notifications, do nothing.
        }
      });
    }

    void boot();
    return () => {
      cancelled = true;
      try {
        unsub?.();
      } catch {
        // ignore
      }
    };
  }, []);

  return null;
}
