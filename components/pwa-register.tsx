"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      // Single SW for both PWA shell caching and Firebase background push.
      navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" }).catch(() => {
        // Non-blocking registration failure.
      });
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad, { once: true });
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  return null;
}
