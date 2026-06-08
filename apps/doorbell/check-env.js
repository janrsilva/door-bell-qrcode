require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

const required = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_BASE_URL",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_DATABASE_URL",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "FIREBASE_ADMIN_SA_JSON",
];

const recommended = ["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"];

const missing = required.filter((name) => !process.env[name]);
const missingRecommended = recommended.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error("Missing required environment variables:");
  missing.forEach((name) => console.error(`- ${name}`));
  process.exit(1);
}

if (missingRecommended.length > 0) {
  console.warn("Missing recommended environment variables:");
  missingRecommended.forEach((name) => console.warn(`- ${name}`));
}

console.log("Environment variables look ready.");
