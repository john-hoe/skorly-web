export const supabaseAuthCookieOptions = {
  path: "/",
  sameSite: "lax" as const,
  httpOnly: true,
  secure: process.env.NODE_ENV !== "development",
};

export function withSupabaseAuthCookieOptions<T extends object>(options: T) {
  return {
    ...options,
    ...supabaseAuthCookieOptions,
  };
}
