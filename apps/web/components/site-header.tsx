import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { HeaderAuth } from "@/components/header-auth";
import { NotifyBell } from "@/components/notify-bell";

export function SiteHeader() {
  const t = useTranslations("nav");
  const tSite = useTranslations("site");
  const links = [
    { href: "/skor", label: t("scores") },
    { href: "/piala-dunia-2026", label: t("worldCup") },
    { href: "/jadwal", label: t("matches") },
    { href: "/tim", label: t("teams") },
    { href: "/berita", label: t("news") },
    { href: "/arsip", label: t("articles") },
    { href: "/peringkat", label: t("leaderboard") },
    { href: "/liga", label: t("leagues") },
  ] as const;

  return (
    <header className="border-b border-[var(--border)] sticky top-0 z-40 bg-[var(--background)]/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="shrink-0 font-bold text-lg tracking-tight">
          <span className="text-[var(--brand)]">Skor</span>ly
        </Link>

        <div className="flex min-w-0 items-center gap-2">
          <nav className="hidden items-center gap-4 text-sm lg:flex">
            {links.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-[var(--brand)]">
                {item.label}
              </Link>
            ))}
          </nav>

          <span className="hidden lg:inline-flex">
            <NotifyBell compact />
          </span>

          <HeaderAuth />

          <span className="hidden lg:inline-flex">
            <LocaleSwitcher />
          </span>

          <details className="group relative lg:hidden">
            <summary className="flex h-9 cursor-pointer list-none items-center rounded-lg border border-[var(--border)] px-3 text-sm font-medium hover:border-[var(--brand)] [&::-webkit-details-marker]:hidden">
              {t("menu")}
            </summary>
            <div className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-[var(--border)] bg-[var(--background)] p-2 shadow-lg">
              <nav className="grid gap-1 text-sm">
                {links.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md px-3 py-2 hover:bg-[var(--card)] hover:text-[var(--brand)]"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-2">
                <NotifyBell compact />
                <LocaleSwitcher />
              </div>
            </div>
          </details>
        </div>
      </div>
      <span className="sr-only">{tSite("tagline")}</span>
    </header>
  );
}
