"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { track } from "@/lib/analytics";

const NAV_ITEMS = [
  { href: "/skor", label: "scores", marker: "LIVE" },
  { href: "/jadwal", label: "matches", marker: "CAL" },
  { href: "/prediksi", label: "predictions", marker: "PICK" },
  { href: "/peringkat", label: "leaderboard", marker: "TOP" },
  { href: "/akun", label: "account", marker: "ME" },
] as const;

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("mobileNav")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--background)]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto grid h-16 max-w-5xl grid-cols-5 px-1">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          const label = t(item.label);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={() =>
                track("mobile_bottom_nav_click", {
                  target: item.href,
                  currentPath: pathname,
                })
              }
              className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-center transition ${
                active
                  ? "text-[var(--brand)]"
                  : "text-[var(--muted)] hover:text-[var(--brand)]"
              }`}
            >
              <span
                aria-hidden
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none ${
                  active
                    ? "bg-[var(--brand)] text-white"
                    : "bg-[var(--card)] text-[var(--muted)]"
                }`}
              >
                {item.marker}
              </span>
              <span className="max-w-full text-[10px] font-semibold leading-tight [overflow-wrap:anywhere]">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
