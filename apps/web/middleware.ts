import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";

// NOTE: kept as `middleware.ts` (not Next 16's `proxy.ts`) because the
// Cloudflare OpenNext adapter does not yet support Node-runtime proxy.ts.
// next-intl's middleware is Edge-compatible, so this runs fine.
const intlMiddleware = createIntlMiddleware(routing);

/**
 * Runs next-intl routing first, then refreshes the Supabase Auth session,
 * writing any rotated cookies onto the response next-intl produced. This keeps
 * SSR auth state fresh on every navigation without a second redirect.
 */
export async function middleware(request: NextRequest) {
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
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Match all paths except api, auth (OAuth callback, no locale prefix),
  // og (dynamic OG image route handler), _next, _vercel, and files with an extension.
  matcher: ["/((?!api|auth|og|_next|_vercel|.*\\..*).*)"],
};
