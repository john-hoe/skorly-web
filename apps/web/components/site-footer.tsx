import { useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] mt-16">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-[var(--muted)] space-y-3">
        <nav className="flex flex-wrap gap-4">
          <a href="/privacy" className="hover:text-[var(--brand)]">
            {t("privacy")}
          </a>
          <a href="/terms" className="hover:text-[var(--brand)]">
            {t("terms")}
          </a>
        </nav>
        <p>{t("aiDisclosure")}</p>
        <p>
          &copy; {year} {t("copyright")}
        </p>
      </div>
    </footer>
  );
}
