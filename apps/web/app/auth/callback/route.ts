import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Auth redirect target for: OAuth (Google/Facebook), email confirmation, and
 * password recovery. Exchanges the `code` (PKCE) or `token_hash` (OTP) for a
 * session cookie, then sends the user to `next`. Lives outside `[locale]` so
 * next-intl never rewrites it.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = sanitizeNext(searchParams.get("next"));

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // Failed — bounce to the login page of the locale we were heading to.
  const locale = next.split("/")[1] || "id";
  return NextResponse.redirect(`${origin}/${locale}/masuk?error=auth`);
}

/** Only allow same-site relative paths as the redirect target. */
function sanitizeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/id/akun";
  return next;
}
