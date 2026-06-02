import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: [
    "@skorly/db",
    "@skorly/api-football",
    "@skorly/types",
    "@skorly/ui",
  ],
  // Cap SSG worker parallelism: default fans out to ~all CPUs (15 here) and the
  // 1.3k-page static export then OOM-kills the build on a memory-tight machine.
  // Single worker = lowest peak memory (slower, but this is a one-shot deploy).
  experimental: { cpus: 1 },
  // Each static page queries Supabase at build time and occasionally hits a
  // flaky DB connection stall. Lower the per-page timeout from the 600s default
  // so a stalled page fails fast and Next retries it quickly (retries succeed
  // fast in practice), instead of waiting out the long default timeout.
  staticPageGenerationTimeout: 120,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.api-sports.io" },
      { protocol: "https", hostname: "**.skorly.cc" },
    ],
  },
};

export default withNextIntl(nextConfig);
