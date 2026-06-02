"use client";

import { useParams } from "next/navigation";
import { useTransition } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const LABELS: Record<Locale, string> = {
  id: "ID",
  vi: "VI",
  en: "EN",
  zh: "中文",
};

/** Dynamic segment names from App Router (exclude locale prefix). */
function routeParams(params: Record<string, string | string[] | undefined>) {
  const { locale: _locale, ...rest } = params;
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
      {routing.locales.map((code) => {
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
            {LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
