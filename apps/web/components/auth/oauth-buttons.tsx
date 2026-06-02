"use client";

import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Google / Facebook sign-in. Hidden unless NEXT_PUBLIC_ENABLE_OAUTH === "true"
 * so we never show broken buttons before the OAuth apps are configured in the
 * Supabase dashboard (Authentication -> Providers).
 */
export function OAuthButtons({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  if (process.env.NEXT_PUBLIC_ENABLE_OAUTH !== "true") return null;

  async function signIn(provider: "google" | "facebook") {
    const supabase = createSupabaseBrowserClient();
    const next = encodeURIComponent(`/${locale}/akun`);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    });
  }

  return (
    <div className="space-y-2">
      <div className="relative my-3 text-center">
        <span className="relative z-10 bg-[var(--card)] px-2 text-xs text-[var(--muted)]">
          {t("login.orContinue")}
        </span>
        <span className="absolute inset-x-0 top-1/2 h-px bg-[var(--border)]" />
      </div>
      <button
        type="button"
        onClick={() => signIn("google")}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-medium hover:bg-[var(--card)]"
      >
        {t("google")}
      </button>
      <button
        type="button"
        onClick={() => signIn("facebook")}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-medium hover:bg-[var(--card)]"
      >
        {t("facebook")}
      </button>
    </div>
  );
}
