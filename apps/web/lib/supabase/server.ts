import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 * Reads/writes the auth cookies via Next's cookie store. In a Server Component
 * the cookie `set` throws (read-only) — that's fine because the middleware
 * refreshes the session, so we swallow it.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — middleware handles refresh.
          }
        },
      },
    },
  );
}

/**
 * The current authenticated user (verified against the Supabase Auth server),
 * or null. Safe to call in any server context.
 */
export async function getSessionUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data?.user ?? null;
  } catch {
    // Transient Supabase/network failure (notably on the Cloudflare Workers
    // runtime) must not crash the page — degrade to logged-out. This was the
    // cause of intermittent 500s (Worker 1101) on /prediksi and other pages.
    return null;
  }
}
