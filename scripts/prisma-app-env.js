const fs = require("fs");
const { spawnSync } = require("child_process");
const dotenv = require("dotenv");

const appEnvPath = "apps/doorbell/.env.local";
const appEnv = fs.existsSync(appEnvPath)
  ? dotenv.parse(fs.readFileSync(appEnvPath))
  : {};

if (!appEnv.DATABASE_URL && !process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL. Set it in apps/doorbell/.env.local or in the deployment environment.");
  process.exit(1);
}

const result = spawnSync("pnpm", ["--dir", "apps/doorbell", "exec", "prisma", ...process.argv.slice(2)], {
  env: {
    ...process.env,
    ...appEnv,
  },
  stdio: "inherit",
});

process.exit(result.status ?? 1);
