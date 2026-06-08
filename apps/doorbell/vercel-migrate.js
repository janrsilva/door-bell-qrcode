const { spawnSync } = require("child_process");

const shouldRun = process.env.VERCEL === "1" || process.env.RUN_MIGRATIONS_ON_BUILD === "1";

if (!shouldRun) {
  console.log("Skipping prisma migrate deploy outside Vercel build.");
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
