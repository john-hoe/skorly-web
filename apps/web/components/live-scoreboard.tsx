"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getLiveScores } from "@/lib/score-actions";
import { ScoreRow } from "@/components/score-row";
import type { ScoreRow as Row } from "@/lib/score-types";

const POLL_MS = 45_000;

export function LiveScoreboard({ initial }: { initial: Row[] }) {
  const t = useTranslations("scores");
  const [rows, setRows] = useState<Row[]>(initial);

  useEffect(() => {
    let active = true;
    const tick = () => {
      getLiveScores()
        .then((r) => {
          if (active) setRows(r);
        })
        .catch(() => {});
    };
    const id = setInterval(tick, POLL_MS);
    // refresh once on mount in case the SSR snapshot is stale
    tick();
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted)]">
        {t("noLive")}
      </p>
    );
  }

  return (
    <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      {rows.map((row) => (
        <ScoreRow key={row.id} row={row} />
      ))}
    </div>
  );
}
