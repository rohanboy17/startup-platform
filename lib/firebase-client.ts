import { getApps, initializeApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

export function getFirebaseWebConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
}

export function isFirebaseWebConfigured() {
  return Boolean(getFirebaseWebConfig() && process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY);
}

export function isAppleMobileBrowser() {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || "";
  const classicIOS = /iphone|ipad|ipod/i.test(ua);
  const ipadDesktopMode = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return classicIOS || ipadDesktopMode;
}

export function isFirebaseWebPushSupportedInBrowser() {
  return !isAppleMobileBrowser();
}

export async function ensureFirebaseMessagingServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  const registration = await navigator.serviceWorker.getRegistration("/");
  const scriptUrl =
    registration?.active?.scriptURL ??
    registration?.waiting?.scriptURL ??
    registration?.installing?.scriptURL ??
    "";

  if (registration && scriptUrl.includes("/firebase-messaging-sw.js")) {
    return registration;
  }

  return navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
}

export async function getBrowserMessaging() {
  const config = getFirebaseWebConfig();
  if (!config || !isFirebaseWebPushSupportedInBrowser() || !(await isSupported())) {
    return null;
  }

  const app = getApps()[0] ?? initializeApp(config);
  return getMessaging(app);
}
