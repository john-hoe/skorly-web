import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseAuthCookieOptions, withSupabaseAuthCookieOptions } from "@/lib/supabase/cookies";

/**
 * Auth redirect target for: OAuth (Google/Facebook), email confirmation, and
 * password recovery. Exchanges the `code` (PKCE) or `token_hash` (OTP) for a
 * session cookie, then sends the user to `next`. Lives outside `[locale]` so
 * next-intl never rewrites it.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = sanitizeNext(searchParams.get("next"));

  if (!code && isRecoveryResetPath(next) && (!tokenHash || type === "recovery")) {
    return recoveryBridge(next, tokenHash);
  }

  const successResponse = noStoreRedirect(`${origin}${next}`);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value, options } of cookiesToSet) {
            successResponse.cookies.set(name, value, withSupabaseAuthCookieOptions(options));
          }
          for (const [key, value] of Object.entries(headers)) {
            successResponse.headers.set(key, value);
          }
        },
      },
      cookieOptions: supabaseAuthCookieOptions,
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return successResponse;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return successResponse;
  }

  // Failed — bounce to the login page of the locale we were heading to.
  const locale = next.split("/")[1] || "id";
  return noStoreRedirect(`${origin}/${locale}/masuk?error=auth`);
}

/** Only allow same-site relative paths as the redirect target. */
function sanitizeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/id/akun";
  return next;
}

function noStoreRedirect(url: string) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function isRecoveryResetPath(path: string): boolean {
  return /^\/(id|vi|en|zh)\/atur-ulang-sandi$/.test(path);
}

function recoveryBridge(next: string, tokenHash?: string | null) {
  const locale = next.split("/")[1] || "id";
  const login = `/${locale}/masuk?error=auth`;
  const payload = JSON.stringify({ next, login, tokenHash: tokenHash || null }).replaceAll("<", "\\u003c");
  const html = `<!doctype html><html lang="${locale}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Skorly</title></head>
<body>
<script>
(function () {
  var config = ${payload};
  var hash = new URLSearchParams(window.location.hash.slice(1));
  var accessToken = hash.get("access_token");
  var refreshToken = hash.get("refresh_token");
  var type = hash.get("type");
  if (!config.tokenHash && (type !== "recovery" || !accessToken || !refreshToken)) {
    window.location.replace(config.login);
    return;
  }
  var body = config.tokenHash
    ? { tokenHash: config.tokenHash, next: config.next }
    : {
        accessToken: accessToken,
        refreshToken: refreshToken,
        next: config.next
      };
  fetch("/api/auth/recovery-session", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(function (response) {
    if (!response.ok) throw new Error("auth");
    window.location.replace(config.next);
  }).catch(function () {
    window.location.replace(config.login);
  });
})();
</script>
</body></html>`;
  const response = new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer",
    },
  });
  response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'");
  return response;
}
