"use client";

import { useParams } from "next/navigation";
import { useTransition } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { type Locale } from "@/i18n/routing";
import { LOCALE_LABELS, PUBLIC_LOCALES } from "@/i18n/locales";

/** Dynamic segment names from App Router (exclude locale prefix). */
function routeParams(params: Record<string, string | string[] | undefined>) {
  const rest = { ...params };
  delete rest.locale;
  return rest;
}

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  function switchLocale(code: Locale) {
    if (code === locale || isPending) return;

    const dynamic = routeParams(params);
    const hasDynamic = Object.keys(dynamic).length > 0;

    startTransition(() => {
      const href = hasDynamic ? { pathname, params: dynamic } : pathname;
      router.replace(
        href as Parameters<typeof router.replace>[0],
        { locale: code }
      );
    });
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] p-0.5 text-xs">
      {PUBLIC_LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            aria-current={active ? "true" : undefined}
            disabled={active || isPending}
            onClick={() => switchLocale(code)}
            className={`rounded-full px-2.5 py-1 font-medium transition-colors disabled:opacity-100 ${
              active
                ? "bg-[var(--brand)] text-white"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {LOCALE_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
