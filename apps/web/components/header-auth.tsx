"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Client island for the header's auth area. Reading the session here (rather
 * than in the server-rendered header) keeps the ~1.3k static content pages
 * statically cacheable — only this island hydrates with the user's state.
 */
export function HeaderAuth() {
  const t = useTranslations("nav");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setSignedIn(!!data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session?.user);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Until we know, render the logged-out CTA (matches first paint for visitors).
  if (signedIn) {
    return (
      <Link
        href="/akun"
        className="rounded-lg bg-[var(--brand)] px-3 py-1.5 font-semibold text-white hover:bg-[var(--brand-dark)]"
      >
        {t("account")}
      </Link>
    );
  }

  return (
    <>
      <Link href="/masuk" className="hover:text-[var(--brand)]">
        {t("login")}
      </Link>
      <Link
        href="/daftar"
        className="rounded-lg bg-[var(--brand)] px-3 py-1.5 font-semibold text-white hover:bg-[var(--brand-dark)] hidden sm:inline"
      >
        {t("register")}
      </Link>
    </>
  );
}
