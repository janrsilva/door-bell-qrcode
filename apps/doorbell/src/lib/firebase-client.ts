import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

let firebaseClientApp: FirebaseApp | null = null;

function getFirebaseConfig() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  } as const;

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase client config: ${missing.join(", ")}. Ensure NEXT_PUBLIC_FIREBASE_* env vars are set.`
    );
  }

  return config as Record<string, string>;
}

export function getFirebaseClientApp(): FirebaseApp {
  if (firebaseClientApp) {
    return firebaseClientApp;
  }

  if (typeof window === "undefined") {
    throw new Error("Attempted to initialize Firebase client on the server");
  }

  if (getApps().length > 0) {
    firebaseClientApp = getApp();
    return firebaseClientApp;
  }

  firebaseClientApp = initializeApp(getFirebaseConfig());
  return firebaseClientApp;
}

export function getFirebaseRealtimeDatabase() {
  const app = getFirebaseClientApp();
  return getDatabase(app);
}
