const { spawnSync } = require("child_process");

const isProductionVercelBuild =
  process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";
const shouldRun =
  isProductionVercelBuild || process.env.RUN_MIGRATIONS_ON_BUILD === "1";

if (!shouldRun) {
  const target = process.env.VERCEL_ENV ?? "local";
  console.log(`Skipping prisma migrate deploy for ${target} build.`);
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to run prisma migrate deploy.");
  process.exit(1);
}

const result = spawnSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
