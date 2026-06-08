const fs = require("fs");
const { spawnSync } = require("child_process");
const dotenv = require("dotenv");

const appEnvPath = "apps/doorbell/.env.local";
const projectPath = ".vercel/project.json";

if (!fs.existsSync(appEnvPath)) {
  console.error(`Missing ${appEnvPath}. Run pnpm vercel:pull or create it from apps/doorbell/.env.example.`);
  process.exit(1);
}

let productionUrl = process.env.VERCEL_PRODUCTION_URL || process.env.NEXT_PUBLIC_PRODUCTION_URL;

if (!productionUrl && fs.existsSync(projectPath)) {
  const project = JSON.parse(fs.readFileSync(projectPath, "utf8"));
  if (project.projectName) {
    productionUrl = `https://${project.projectName}.vercel.app`;
  }
}

if (!productionUrl) {
  console.error("Missing production URL. Set VERCEL_PRODUCTION_URL before running this command.");
  process.exit(1);
}

const appEnv = dotenv.parse(fs.readFileSync(appEnvPath));
const result = spawnSync("vercel", ["build", "--prod"], {
  env: {
    ...process.env,
    ...appEnv,
    NEXTAUTH_URL: productionUrl,
    NEXT_PUBLIC_BASE_URL: productionUrl,
  },
  stdio: "inherit",
});

process.exit(result.status ?? 1);
