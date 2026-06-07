import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    const key = trimmed.slice(0, idx).trim();
    const raw = trimmed.slice(idx + 1).trim();
    out[key] = raw.replace(/^['"]|['"]$/g, "");
  }
  return out;
}

const files = {
  ...parseEnvFile(join(ROOT, ".env")),
  ...parseEnvFile(join(ROOT, "apps/web/.env.local")),
};

function value(key) {
  return process.env[key] ?? files[key] ?? "";
}

const mode = process.argv[2];
const required =
  mode === "web"
    ? ["JOBS_ADMIN_URL", "JOBS_ADMIN_SECRET"]
    : mode === "jobs"
      ? ["JOBS_ADMIN_SECRET"]
      : [];

if (required.length === 0) {
  console.error("Usage: node scripts/check-admin-env.mjs <web|jobs>");
  process.exit(2);
}

const missing = required.filter((key) => !value(key));
const invalid = [];
if (mode === "web" && value("JOBS_ADMIN_URL").includes("YOUR_SUBDOMAIN")) {
  invalid.push("JOBS_ADMIN_URL");
}

if (missing.length || invalid.length) {
  if (missing.length) {
    console.error(`Missing required admin env: ${missing.join(", ")}`);
  }
  if (invalid.length) {
    console.error(`Invalid placeholder admin env: ${invalid.join(", ")}`);
  }
  process.exit(1);
}

console.log(`Admin ${mode} env check passed`);
