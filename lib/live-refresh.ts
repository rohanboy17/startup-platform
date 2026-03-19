"use client";

import { useEffect } from "react";

export const DASHBOARD_LIVE_REFRESH_EVENT = "dashboard-live-refresh";

export function emitDashboardLiveRefresh() {
  window.dispatchEvent(new Event(DASHBOARD_LIVE_REFRESH_EVENT));
}

export function useLiveRefresh(load: () => Promise<void> | void, intervalMs = 15000) {
  useEffect(() => {
    const runLoad = () => {
      try {
        const result = load();
        if (result && typeof (result as Promise<void>).catch === "function") {
          void (result as Promise<void>).catch((error) => {
            console.error("Live refresh load failed", error);
          });
        }
      } catch (error) {
        console.error("Live refresh load failed", error);
      }
    };

    runLoad();

    const onLiveRefresh = () => {
      runLoad();
    };

    const onFocus = () => {
      runLoad();
    };

    window.addEventListener(DASHBOARD_LIVE_REFRESH_EVENT, onLiveRefresh);
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => {
      runLoad();
    }, intervalMs);

    return () => {
      window.removeEventListener(DASHBOARD_LIVE_REFRESH_EVENT, onLiveRefresh);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [load, intervalMs]);
}
