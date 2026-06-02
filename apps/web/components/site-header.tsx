import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { HeaderAuth } from "@/components/header-auth";
import { NotifyBell } from "@/components/notify-bell";

export function SiteHeader() {
  const t = useTranslations("nav");
  const tSite = useTranslations("site");

  return (
    <header className="border-b border-[var(--border)] sticky top-0 z-40 bg-[var(--background)]/90 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="font-bold text-lg tracking-tight shrink-0">
          <span className="text-[var(--brand)]">Skor</span>ly
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/skor" className="hover:text-[var(--brand)]">
            {t("scores")}
          </Link>
          <Link href="/piala-dunia-2026" className="hover:text-[var(--brand)] hidden sm:inline">
            {t("worldCup")}
          </Link>
          <Link href="/jadwal" className="hover:text-[var(--brand)] hidden md:inline">
            {t("matches")}
          </Link>
          <Link href="/tim" className="hover:text-[var(--brand)] hidden md:inline">
            {t("teams")}
          </Link>
          <Link href="/berita" className="hover:text-[var(--brand)]">
            {t("news")}
          </Link>
          <Link href="/arsip" className="hover:text-[var(--brand)] hidden sm:inline">
            {t("articles")}
          </Link>
          <Link href="/peringkat" className="hover:text-[var(--brand)]">
            {t("leaderboard")}
          </Link>
          <Link href="/liga" className="hover:text-[var(--brand)] hidden sm:inline">
            {t("leagues")}
          </Link>
          <span className="hidden sm:inline">
            <NotifyBell compact />
          </span>
          <HeaderAuth />
          <LocaleSwitcher />
        </nav>
      </div>
      <span className="sr-only">{tSite("tagline")}</span>
    </header>
  );
}
