"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function isStandalone() {
  if (typeof window === "undefined") return false;
  const displayModeStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const navigatorStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return Boolean(displayModeStandalone || navigatorStandalone);
}

function hasAuthCookie() {
  if (typeof document === "undefined") return false;
  const cookie = document.cookie || "";
  // NextAuth v4 commonly uses these cookie names depending on HTTPS and config.
  return (
    cookie.includes("next-auth.session-token=") ||
    cookie.includes("__Secure-next-auth.session-token=") ||
    cookie.includes("__Host-next-auth.session-token=")
  );
}

export default function PwaStandaloneDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (!isStandalone()) return;
    // Only redirect users who likely have an active session; otherwise keep landing.
    if (!hasAuthCookie()) return;
    router.replace("/dashboard");
  }, [router]);

  return null;
}

