"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function isStandalone() {
  if (typeof window === "undefined") return false;
  const displayModeStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const navigatorStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return Boolean(displayModeStandalone || navigatorStandalone);
}

export default function PwaStandaloneDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (!isStandalone()) return;

    // NextAuth session cookies are HttpOnly, so we cannot rely on `document.cookie`.
    // Instead, ask the NextAuth session endpoint and redirect if authenticated.
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store", credentials: "include" });
        if (!res.ok) return;
        const session = (await res.json().catch(() => null)) as { user?: unknown } | null;
        if (!cancelled && session?.user) {
          router.replace("/dashboard");
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
