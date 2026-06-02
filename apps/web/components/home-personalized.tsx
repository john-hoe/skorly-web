"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getHomePersonalization, type HomePersonalization } from "@/lib/home-actions";

export function HomePersonalized() {
  const t = useTranslations("home");
  const [data, setData] = useState<HomePersonalization | null>(null);

  useEffect(() => {
    let active = true;
    getHomePersonalization().then((d) => {
      if (active) setData(d);
    });
    return () => {
      active = false;
    };
  }, []);

  if (data === null) {
    return <div className="h-20 animate-pulse rounded-2xl bg-[var(--card)]" aria-hidden />;
  }

  // Anonymous → register hook
  if (!data.auth) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div>
          <p className="font-semibold">{t("guestTitle")}</p>
          <p className="text-sm text-[var(--muted)]">{t("guestDesc")}</p>
        </div>
        <Link
          href="/daftar"
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
        >
          {t("guestCta")}
        </Link>
      </div>
    );
  }

  // Signed-in → mini stats + continue predicting
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center gap-6">
        <Stat label={t("myPoints")} value={data.points} />
        <Stat label={t("myRank")} value={data.rank != null ? `#${data.rank}` : "—"} />
      </div>
      {data.nextMatch ? (
        <Link
          href={{ pathname: "/pertandingan/[slug]", params: { slug: data.nextMatch.slug } }}
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
        >
          {t("continuePredicting")}
        </Link>
      ) : (
        <Link href="/peringkat" className="text-sm font-semibold text-[var(--brand)]">
          {t("viewLeaderboard")}
        </Link>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-xl font-bold tabular-nums text-[var(--brand)]">{value}</div>
      <div className="text-xs text-[var(--muted)]">{label}</div>
    </div>
  );
}
