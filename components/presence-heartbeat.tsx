"use client";

import { useEffect } from "react";

async function pingPresence() {
  try {
    await fetch("/api/presence/ping", {
      method: "POST",
      credentials: "include",
      keepalive: true,
      cache: "no-store",
    });
  } catch {
    // Ignore heartbeat errors on client.
  }
}

export default function PresenceHeartbeat() {
  useEffect(() => {
    void pingPresence();

    const onFocus = () => {
      void pingPresence();
    };

    const onVisibility = () => {
      if (!document.hidden) {
        void pingPresence();
      }
    };

    const timer = window.setInterval(() => {
      if (!document.hidden) {
        void pingPresence();
      }
    }, 60 * 1000);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}

