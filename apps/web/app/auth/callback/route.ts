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
