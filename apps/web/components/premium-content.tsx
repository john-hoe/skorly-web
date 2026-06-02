"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getPremiumArticle } from "@/lib/premium-actions";

interface Props {
  fixtureId: number;
  /** Free preview HTML rendered server-side (SEO + teaser). */
  previewHtml: string;
}

type State =
  | { kind: "loading" }
  | { kind: "locked" }
  | { kind: "unlocked"; html: string };

/**
 * Content tiering for the prediction plan. The free preview is always rendered
 * server-side (good for SEO + anonymous teaser). The full deep-dive is fetched
 * via a server action and only returned to signed-in members, so this page can
 * stay statically cached while still gating premium content.
 */
export function PremiumContent({ fixtureId, previewHtml }: Props) {
  const t = useTranslations("premium");
  const locale = useLocale();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    getPremiumArticle(fixtureId, locale)
      .then((res) => {
        if (!active) return;
        setState(res.authorized ? { kind: "unlocked", html: res.html } : { kind: "locked" });
      })
      .catch(() => active && setState({ kind: "locked" }));
    return () => {
      active = false;
    };
  }, [fixtureId, locale]);

  if (state.kind === "unlocked") {
    return (
      <div className="prose-skorly" dangerouslySetInnerHTML={{ __html: state.html }} />
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="prose-skorly relative max-h-72 overflow-hidden [mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-center space-y-3">
        <span className="inline-block rounded-full bg-[var(--brand)]/10 px-3 py-1 text-xs font-semibold text-[var(--brand)]">
          {t("badge")}
        </span>
        <p className="font-bold">{t("locked")}</p>
        <p className="text-sm text-[var(--muted)]">{t("lockedHint")}</p>
        {state.kind === "loading" ? (
          <p className="text-sm text-[var(--muted)]">{t("loading")}</p>
        ) : (
          <Link
            href="/masuk"
            className="inline-block rounded-lg bg-[var(--brand)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
          >
            {t("login")}
          </Link>
        )}
      </div>
    </div>
  );
}
