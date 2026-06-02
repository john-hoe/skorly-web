import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";

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
          <Link href="/piala-dunia-2026" className="hover:text-[var(--brand)] hidden sm:inline">
            {t("worldCup")}
          </Link>
          <Link href="/berita" className="hover:text-[var(--brand)]">
            {t("news")}
          </Link>
          <Link href="/arsip" className="hover:text-[var(--brand)] hidden sm:inline">
            {t("articles")}
          </Link>
          <a href="mailto:business@skorly.cc" className="hover:text-[var(--brand)]">
            {t("contact")}
          </a>
          <LocaleSwitcher />
        </nav>
      </div>
      <span className="sr-only">{tSite("tagline")}</span>
    </header>
  );
}
