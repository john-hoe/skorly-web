import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

function commandOutput(command: string): string | null {
  try {
    return execSync(command, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function buildId(): string {
  const commit = commandOutput("git rev-parse --short=12 HEAD") ?? "unknown";
  const content =
    process.env.SKORLY_CONTENT_BUILD_ID ??
    commandOutput("pnpm exec tsx scripts/content-build-id.ts") ??
    Math.floor(Date.now() / 1000).toString(36);
  return `${commit}-${content}`;
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://us-assets.i.posthog.com https://challenges.cloudflare.com https://cdn.ampproject.org https://platform.twitter.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://ep2.adtrafficquality.google",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com https://www.google.com https://us.i.posthog.com https://challenges.cloudflare.com https://cdn.ampproject.org https://platform.twitter.com https://*.twitter.com https://*.x.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://ep1.adtrafficquality.google https://csi.gstatic.com",
  "frame-src 'self' https://challenges.cloudflare.com https://www.youtube-nocookie.com https://www.youtube.com https://platform.twitter.com https://*.twitter.com https://*.x.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://ep2.adtrafficquality.google",
  "child-src 'self' https://challenges.cloudflare.com https://www.youtube-nocookie.com https://www.youtube.com https://platform.twitter.com https://*.twitter.com https://*.x.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://ep2.adtrafficquality.google",
  "worker-src 'self' blob:",
  "media-src 'self' data: blob: https:",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), midi=(), xr-spatial-tracking=(), browsing-topics=()",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  transpilePackages: [
    "@skorly/db",
    "@skorly/api-football",
    "@skorly/predict-model",
    "@skorly/types",
    "@skorly/ui",
  ],
  // Cap SSG worker parallelism: default fans out to ~all CPUs (15 here) and can
  // OOM-kill memory-tight builds. Three workers keep peak usage bounded while
  // letting cached static generation finish materially faster than one worker.
  experimental: { cpus: 3 },
  // Each static page queries Supabase at build time and occasionally hits a
  // flaky DB connection stall. Lower the per-page timeout from the 600s default
  // so a stalled page fails fast and Next retries it quickly (retries succeed
  // fast in practice), instead of waiting out the long default timeout.
  staticPageGenerationTimeout: 120,
  generateBuildId: async () => process.env.NEXT_BUILD_ID ?? buildId(),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.api-sports.io" },
      { protocol: "https", hostname: "**.skorly.cc" },
    ],
  },
};

export default withNextIntl(nextConfig);
