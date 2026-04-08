"use client";

import { useEffect, useRef } from "react";

export const DASHBOARD_LIVE_REFRESH_EVENT = "dashboard-live-refresh";

export function emitDashboardLiveRefresh() {
  window.dispatchEvent(new Event(DASHBOARD_LIVE_REFRESH_EVENT));
}

export function useLiveRefresh(load: () => Promise<void> | void, intervalMs = 30000) {
  const loadRef = useRef(load);
  const inFlightRef = useRef(false);
  const lastRunRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  loadRef.current = load;

  useEffect(() => {
    const getEffectiveInterval = () => {
      const minimumInterval = Math.max(intervalMs, 20000);
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      const lowCoreDevice =
        typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4;
      if (connection?.saveData || lowCoreDevice) {
        return Math.max(minimumInterval, 45000);
      }
      return minimumInterval;
    };

    const runLoad = async (force = false) => {
      if (!force && document.visibilityState !== "visible") {
        return;
      }
      const now = Date.now();
      if (!force && now - lastRunRef.current < 1500) {
        return;
      }
      if (inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;
      lastRunRef.current = now;
      try {
        await loadRef.current();
      } finally {
        inFlightRef.current = false;
        scheduleNext();
      }
    };

    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const scheduleNext = () => {
      clearTimer();
      if (document.visibilityState !== "visible") {
        return;
      }
      timerRef.current = window.setTimeout(() => {
        void runLoad();
      }, getEffectiveInterval());
    };

    void runLoad(true);

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
      scheduleNext();
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
