import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function SiteFooter() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const tStories = useTranslations("stories");
  const tTeam = useTranslations("team");
  const tWatch = useTranslations("watch");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] mt-16">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-[var(--muted)] space-y-3">
        <nav className="flex flex-wrap gap-4">
          <Link href="/skor" className="hover:text-[var(--brand)]">
            {tNav("scores")}
          </Link>
          <Link href="/jadwal" className="hover:text-[var(--brand)]">
            {tNav("matches")}
          </Link>
          <Link href="/tim" className="hover:text-[var(--brand)]">
            {tTeam("allTeams")}
          </Link>
          <Link href="/cerita" className="hover:text-[var(--brand)]">
            {tStories("title")}
          </Link>
          <Link href="/nonton" className="hover:text-[var(--brand)]">
            {tWatch("title")}
          </Link>
        </nav>
        <nav className="flex flex-wrap gap-4">
          {/* Legal pages are static top-level placeholders outside localized routing. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/privacy" className="hover:text-[var(--brand)]">
            {t("privacy")}
          </a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/terms" className="hover:text-[var(--brand)]">
            {t("terms")}
          </a>
        </nav>
        <p>
          {t("contact")}:{" "}
          <a
            href="mailto:business@skorly.cc"
            className="text-[var(--brand)] hover:underline"
          >
            business@skorly.cc
          </a>
        </p>
        <p>
          &copy; {year} {t("copyright")}
        </p>
      </div>
    </footer>
  );
}
