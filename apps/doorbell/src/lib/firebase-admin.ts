import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

let firebaseAdminApp: App | null = null;

function buildFirebaseAdminApp(): App {
  if (firebaseAdminApp) {
    return firebaseAdminApp;
  }

  if (getApps().length) {
    firebaseAdminApp = getApps()[0]!;
    return firebaseAdminApp;
  }

  const serviceAccountBase64 = process.env.FIREBASE_ADMIN_SA_JSON;
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

  if (!serviceAccountBase64 || !databaseURL) {
    throw new Error(
      "Missing Firebase Admin credentials. Ensure FIREBASE_ADMIN_SA_JSON and NEXT_PUBLIC_FIREBASE_DATABASE_URL are set."
    );
  }

  try {
    // Decode base64 service account key
    const serviceAccountJson = Buffer.from(
      serviceAccountBase64,
      "base64"
    ).toString("utf-8");
    const serviceAccount = JSON.parse(serviceAccountJson);

    firebaseAdminApp = initializeApp({
      credential: cert(serviceAccount),
      databaseURL,
    });
  } catch (error) {
    throw new Error(
      `Failed to parse Firebase service account key: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  return firebaseAdminApp;
}

export function getFirebaseAdminApp(): App {
  return buildFirebaseAdminApp();
}

export { getDatabase };
