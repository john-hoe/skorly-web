import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";

// NOTE: kept as `middleware.ts` (not Next 16's `proxy.ts`) because the
// Cloudflare OpenNext adapter does not yet support Node-runtime proxy.ts.
// next-intl's middleware is Edge-compatible, so this runs fine.
const intlMiddleware = createIntlMiddleware(routing);

function authLandingRedirect(request: NextRequest) {
  const { nextUrl } = request;
  const isLocaleRoot =
    nextUrl.pathname === "/" ||
    routing.locales.some((locale) => nextUrl.pathname === `/${locale}`);
  if (!isLocaleRoot) return null;

  const code = nextUrl.searchParams.get("code");
  const tokenHash = nextUrl.searchParams.get("token_hash");
  const type = nextUrl.searchParams.get("type");
  if (!code && !(tokenHash && type)) return null;

  const locale =
    routing.locales.find((l) => nextUrl.pathname === `/${l}`) ??
    routing.defaultLocale;
  const target =
    type === "recovery"
      ? `/${locale}/atur-ulang-sandi`
      : `/${locale}/akun`;

  const callback = new URL("/auth/callback", nextUrl.origin);
  if (code) callback.searchParams.set("code", code);
  if (tokenHash) callback.searchParams.set("token_hash", tokenHash);
  if (type) callback.searchParams.set("type", type);
  callback.searchParams.set("next", target);
  return NextResponse.redirect(callback);
}

/**
 * Runs next-intl routing first, then refreshes the Supabase Auth session,
 * writing any rotated cookies onto the response next-intl produced. This keeps
 * SSR auth state fresh on every navigation without a second redirect.
 */
export async function middleware(request: NextRequest) {
  const authRedirect = authLandingRedirect(request);
  if (authRedirect) return authRedirect;

  const response = intlMiddleware(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Touch the session so expired access tokens are refreshed (cookies rotated).
  // Auth refresh must never take the whole Worker down; protected pages perform
  // their own auth check and can redirect to login if the session is invalid.
  try {
    await supabase.auth.getUser();
  } catch (error) {
    console.warn("[auth] middleware session refresh failed", error);
  }

  return response;
}

export const config = {
  // Match all paths except api, auth (OAuth callback, no locale prefix),
  // og (dynamic OG image route handler), _next, _vercel, and files with an extension.
  matcher: ["/((?!api|auth|og|_next|_vercel|.*\\..*).*)"],
};
