#!/usr/bin/env node

const { readFileSync } = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const versionPath = path.join(
  repoRoot,
  "apps/doorbell/public/app-version.json",
);
const swPath = path.join(repoRoot, "apps/doorbell/public/sw.js");

const versionPayload = JSON.parse(readFileSync(versionPath, "utf8"));
const swContent = readFileSync(swPath, "utf8");

const version = String(versionPayload.version || "");
const match = version.match(
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})-03:00$/,
);

if (!match) {
  console.error("app-version.json está sem versão no formato esperado.");
  process.exit(1);
}

const [, year, month, day, hour, minute] = match;
const expectedCacheName = `doorbell-call-${year}${month}${day}${hour}${minute}`;

if (!swContent.includes(`const CACHE_NAME = "${expectedCacheName}";`)) {
  console.error(
    `CACHE_NAME do sw.js não corresponde à versão ${versionPayload.version}.`,
  );
  process.exit(1);
}

console.log(`App version ready: ${versionPayload.label || versionPayload.version}`);
