import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

function getFirebaseConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  // Prevent runtime crashes when env vars are present but not a real service-account credential.
  if (!clientEmail.includes("gserviceaccount.com")) {
    return null;
  }

  if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    return null;
  }

  return { projectId, clientEmail, privateKey };
}

export function isFirebaseAdminConfigured() {
  return Boolean(getFirebaseConfig());
}

export function getFirebaseMessaging() {
  const config = getFirebaseConfig();
  if (!config) {
    return null;
  }

  try {
    const app =
      getApps()[0] ??
      initializeApp({
        credential: cert(config),
        projectId: config.projectId,
      });

    return getMessaging(app);
  } catch {
    return null;
  }
}
