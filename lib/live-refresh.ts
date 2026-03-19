"use client";

import { useEffect } from "react";

export const DASHBOARD_LIVE_REFRESH_EVENT = "dashboard-live-refresh";

export function emitDashboardLiveRefresh() {
  window.dispatchEvent(new Event(DASHBOARD_LIVE_REFRESH_EVENT));
}

export function useLiveRefresh(load: () => Promise<void> | void, intervalMs = 15000) {
  useEffect(() => {
    void load();

    const onLiveRefresh = () => {
      void load();
    };

    const onFocus = () => {
      void load();
    };

    window.addEventListener(DASHBOARD_LIVE_REFRESH_EVENT, onLiveRefresh);
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => {
      void load();
    }, intervalMs);

    return () => {
      window.removeEventListener(DASHBOARD_LIVE_REFRESH_EVENT, onLiveRefresh);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [load, intervalMs]);
}
