"use client";

import { useEffect, useRef } from "react";

export const DASHBOARD_LIVE_REFRESH_EVENT = "dashboard-live-refresh";

export function emitDashboardLiveRefresh() {
  window.dispatchEvent(new Event(DASHBOARD_LIVE_REFRESH_EVENT));
}

export function useLiveRefresh(load: () => Promise<void> | void, intervalMs = 15000) {
  const loadRef = useRef(load);
  const inFlightRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  loadRef.current = load;

  useEffect(() => {
    const runLoad = async (force = false) => {
      if (!force && document.visibilityState !== "visible") {
        return;
      }
      if (inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;
      try {
        await loadRef.current();
      } finally {
        inFlightRef.current = false;
      }
    };

    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const ensureTimer = () => {
      clearTimer();
      if (document.visibilityState !== "visible") {
        return;
      }
      timerRef.current = window.setInterval(() => {
        void runLoad();
      }, intervalMs);
    };

    void runLoad(true);
    ensureTimer();

    const onLiveRefresh = () => {
      void runLoad(true);
    };

    const onFocus = () => {
      void runLoad(true);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void runLoad(true);
      }
      ensureTimer();
    };

    window.addEventListener(DASHBOARD_LIVE_REFRESH_EVENT, onLiveRefresh);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener(DASHBOARD_LIVE_REFRESH_EVENT, onLiveRefresh);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearTimer();
    };
  }, [intervalMs]);
}
