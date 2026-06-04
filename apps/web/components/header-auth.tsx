"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Client island for the header's auth area. Resolving the session through a
 * no-store API keeps the static content pages cacheable while the bearer
 * cookie stays unavailable to browser JavaScript.
 */
export function HeaderAuth() {
  const t = useTranslations("nav");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { authenticated?: boolean } | null) => {
        if (active) setSignedIn(data?.authenticated === true);
      })
      .catch(() => {
        if (active) setSignedIn(false);
      });
    return () => {
      active = false;
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
