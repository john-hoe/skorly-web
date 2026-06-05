import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAuthCookieOptions, withSupabaseAuthCookieOptions } from "@/lib/supabase/cookies";

type RecoverySessionBody = {
  accessToken?: unknown;
  refreshToken?: unknown;
  next?: unknown;
};

export async function POST(request: NextRequest) {
  const body = await readBody(request);
  const accessToken = typeof body.accessToken === "string" ? body.accessToken : "";
  const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : "";
  const next = sanitizeResetNext(typeof body.next === "string" ? body.next : null);

  if (!accessToken || !refreshToken || !next) {
    return noStoreJson({ ok: false, error: "auth" }, 401);
  }

  const response = noStoreJson({ ok: true, next }, 200);
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
            response.cookies.set(name, value, withSupabaseAuthCookieOptions(options));
          }
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
      cookieOptions: supabaseAuthCookieOptions,
    },
  );

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) {
    return noStoreJson({ ok: false, error: "auth" }, 401);
  }

  return response;
}

async function readBody(request: Request): Promise<RecoverySessionBody> {
  try {
    return (await request.json()) as RecoverySessionBody;
  } catch {
    return {};
  }
}

function sanitizeResetNext(next: string | null): string | null {
  if (!next || !/^\/(id|vi|en|zh)\/atur-ulang-sandi$/.test(next)) return null;
  return next;
}

function noStoreJson(body: { ok: boolean; error?: string; next?: string }, status: number) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}
