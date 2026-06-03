"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getForecastApi } from "@/lib/runtime-api-client";
import type { MatchForecastView } from "@skorly/db";

export function ForecastCard({ fixtureId }: { fixtureId: number }) {
  const t = useTranslations("forecast");
  const [data, setData] = useState<MatchForecastView | null | "loading">("loading");

  useEffect(() => {
    let active = true;
    getForecastApi(fixtureId)
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {
        if (active) setData(null);
      });
    return () => {
      active = false;
    };
  }, [fixtureId]);

  if (data === "loading") {
    return (
      <div className="h-32 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)]" aria-hidden />
    );
  }
  if (!data) return null;

  const { probabilities: p, mostLikelyScore: s, expectedGoals: xg, confidence } = data.forecast;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">{t("title")}</h2>
        <span className="text-xs text-[var(--muted)]">
          {t("confidence")}: {Math.round(confidence * 100)}%
        </span>
      </div>

      {/* Win / draw / loss bar */}
      <div>
        <div className="flex h-7 overflow-hidden rounded-lg text-xs font-bold text-white">
          <div
            className="flex items-center justify-center bg-[var(--brand)]"
            style={{ width: `${p.homeWin}%` }}
            title={data.homeName}
          >
            {p.homeWin >= 12 ? `${p.homeWin}%` : ""}
          </div>
          <div
            className="flex items-center justify-center bg-[var(--muted)]"
            style={{ width: `${p.draw}%` }}
            title={t("draw")}
          >
            {p.draw >= 12 ? `${p.draw}%` : ""}
          </div>
          <div
            className="flex items-center justify-center bg-slate-700"
            style={{ width: `${p.awayWin}%` }}
            title={data.awayName}
          >
            {p.awayWin >= 12 ? `${p.awayWin}%` : ""}
          </div>
        </div>
        <div className="mt-1 flex justify-between text-xs text-[var(--muted)]">
          <span className="truncate">{data.homeName} {p.homeWin}%</span>
          <span>{t("draw")} {p.draw}%</span>
          <span className="truncate text-right">{data.awayName} {p.awayWin}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-[var(--border)] p-3 text-center">
          <div className="text-lg font-bold tabular-nums">{s.home} - {s.away}</div>
          <div className="text-xs text-[var(--muted)]">{t("mostLikely")}</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-3 text-center">
          <div className="text-lg font-bold tabular-nums">{xg.home} - {xg.away}</div>
          <div className="text-xs text-[var(--muted)]">{t("expectedGoals")}</div>
        </div>
      </div>

      <p className="text-xs text-[var(--muted)]">
        {confidence < 0.3 ? t("lowData") : t("disclaimer")}
      </p>
    </div>
  );
}
