#!/usr/bin/env node

const { execSync } = require("node:child_process");
const { readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const timeZone = "America/Sao_Paulo";
const now = new Date();

function getTimeParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function gitValue(command, fallback = null) {
  try {
    return execSync(command, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return fallback;
  }
}

const parts = getTimeParts(now);
const version = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}-03:00`;
const compactVersion = `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}`;
const label = `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;

const payload = {
  version,
  label,
  timeZone,
  generatedAt: version,
  gitBranch: gitValue("git branch --show-current"),
};

const versionPath = path.join(
  repoRoot,
  "apps/doorbell/public/app-version.json",
);
writeFileSync(versionPath, `${JSON.stringify(payload, null, 2)}\n`);

const swPath = path.join(repoRoot, "apps/doorbell/public/sw.js");
const swContent = readFileSync(swPath, "utf8");
const cacheNamePattern = /^const CACHE_NAME = ".*";$/m;
if (!cacheNamePattern.test(swContent)) {
  throw new Error("Não foi possível encontrar CACHE_NAME em sw.js");
}

const nextSwContent = swContent.replace(
  cacheNamePattern,
  `const CACHE_NAME = "doorbell-call-${compactVersion}";`,
);

writeFileSync(swPath, nextSwContent);
console.log(`App version updated: ${label}`);
