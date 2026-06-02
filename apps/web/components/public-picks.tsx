"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getPicks } from "@/lib/prediction-actions";
import type { PublicPick } from "@skorly/db";

export function PublicPicks({ fixtureId }: { fixtureId: number }) {
  const t = useTranslations("picks");
  const [picks, setPicks] = useState<PublicPick[] | null>(null);

  useEffect(() => {
    let active = true;
    getPicks(fixtureId).then((res) => active && setPicks(res));
    return () => {
      active = false;
    };
  }, [fixtureId]);

  if (picks === null) {
    return <div className="h-16 animate-pulse rounded-xl bg-[var(--card)]" aria-hidden />;
  }
  if (picks.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-xl font-bold">{t("title")}</h2>
        <p className="text-sm text-[var(--muted)]">{t("empty")}</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">{t("title")}</h2>
      <ul className="flex flex-wrap gap-2">
        {picks.map((p, i) => {
          const name = p.authorName?.trim() || "Skorly";
          return (
            <li
              key={`${p.userId}-${i}`}
              className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] py-1 pl-1 pr-3"
            >
              {p.authorAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.authorAvatar} alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand)] text-[10px] font-bold text-white">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="max-w-[7rem] truncate text-xs font-medium">{name}</span>
              <span className="text-xs font-bold tabular-nums text-[var(--brand)]">
                {p.homeGoalsPred}-{p.awayGoalsPred}
              </span>
              {p.pointsAwarded != null && (
                <span className="text-[10px] text-[var(--muted)]">
                  {t("pts", { points: p.pointsAwarded })}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
