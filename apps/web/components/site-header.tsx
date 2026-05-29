import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function SiteHeader() {
  const t = useTranslations("nav");
  const tSite = useTranslations("site");

  return (
    <header className="border-b border-[var(--border)] sticky top-0 z-40 bg-[var(--background)]/90 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">
          <span className="text-[var(--brand)]">Skor</span>ly
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/piala-dunia-2026" className="hover:text-[var(--brand)]">
            {t("worldCup")}
          </Link>
        </nav>
      </div>
      <span className="sr-only">{tSite("tagline")}</span>
    </header>
  );
}
