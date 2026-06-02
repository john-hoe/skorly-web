"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getMyPrediction, submitPrediction } from "@/lib/prediction-actions";
import { ShareButtons } from "@/components/share-buttons";

interface Props {
  fixtureId: number;
  status: string;
  kickoffAt: string | null;
  homeName: string;
  awayName: string;
  homeGoals: number | null;
  awayGoals: number | null;
  sharePath?: string;
}

type Saved = { home: number; away: number; points: number | null } | null;

const NUM =
  "w-14 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-center text-lg font-bold tabular-nums";

export function PredictScore({
  fixtureId,
  status,
  kickoffAt,
  homeName,
  awayName,
  homeGoals,
  awayGoals,
  sharePath,
}: Props) {
  const t = useTranslations("predict");
  const [auth, setAuth] = useState<boolean | null>(null);
  const [saved, setSaved] = useState<Saved>(null);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const kickoffPassed = kickoffAt ? new Date(kickoffAt).getTime() <= Date.now() : false;
  const locked = status !== "scheduled" || kickoffPassed;
  const finished = status === "finished" && homeGoals != null && awayGoals != null;

  useEffect(() => {
    let active = true;
    getMyPrediction(fixtureId).then((res) => {
      if (!active) return;
      if (!res.auth) {
        setAuth(false);
        return;
      }
      setAuth(true);
      if (res.prediction) {
        setSaved({
          home: res.prediction.homeGoalsPred,
          away: res.prediction.awayGoalsPred,
          points: res.prediction.pointsAwarded,
        });
        setHome(String(res.prediction.homeGoalsPred));
        setAway(String(res.prediction.awayGoalsPred));
      }
    });
    return () => {
      active = false;
    };
  }, [fixtureId]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const h = Number(home);
    const a = Number(away);
    if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0) {
      setError(t("errors.invalid"));
      return;
    }
    startTransition(async () => {
      const res = await submitPrediction(fixtureId, h, a);
      if (res.ok) {
        setSaved({ home: h, away: a, points: null });
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2500);
      } else if (res.error === "unauth") {
        setAuth(false);
      } else {
        setError(t(`errors.${res.error}`));
      }
    });
  }

  const card =
    "rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3";

  // Loading
  if (auth === null) {
    return <div className={`${card} h-28 animate-pulse`} aria-hidden />;
  }

  // Not logged in
  if (!auth) {
    return (
      <div className={card}>
        <h2 className="font-bold">{t("title")}</h2>
        <p className="text-sm text-[var(--muted)]">{t("loginToPredict")}</p>
        <Link
          href="/masuk"
          className="inline-block rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
        >
          {t("login")}
        </Link>
      </div>
    );
  }

  // Locked (kickoff passed / live / finished)
  if (locked) {
    const match = `${homeName} vs ${awayName}`;
    const shareText =
      finished && saved && saved.points != null
        ? t("shareResult", { match, home: saved.home, away: saved.away, points: saved.points })
        : saved
          ? t("sharePick", { match, home: saved.home, away: saved.away })
          : "";
    return (
      <div className={card}>
        <h2 className="font-bold">{t("title")}</h2>
        {saved ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted)]">{t("yourPrediction")}</span>
            <span className="font-bold tabular-nums">
              {saved.home} - {saved.away}
              {finished && (
                <span className="ml-2 text-[var(--brand)]">
                  {saved.points != null ? t("pts", { points: saved.points }) : ""}
                </span>
              )}
            </span>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">{t("locked")}</p>
        )}
        {saved && sharePath && <ShareButtons url={sharePath} text={shareText} compact />}
        <LeaderboardLink label={t("leaderboardLink")} />
      </div>
    );
  }

  // Open for predictions
  return (
    <div className={card}>
      <div>
        <h2 className="font-bold">{t("title")}</h2>
        <p className="text-sm text-[var(--muted)]">{t("subtitle")}</p>
      </div>
      <form onSubmit={onSubmit} className="flex items-center justify-center gap-3">
        <span className="text-sm font-medium truncate max-w-[30%] text-right">{homeName}</span>
        <input
          type="number"
          min={0}
          max={99}
          inputMode="numeric"
          aria-label={homeName}
          value={home}
          onChange={(e) => setHome(e.target.value)}
          className={NUM}
          required
        />
        <span className="text-[var(--muted)]">-</span>
        <input
          type="number"
          min={0}
          max={99}
          inputMode="numeric"
          aria-label={awayName}
          value={away}
          onChange={(e) => setAway(e.target.value)}
          className={NUM}
          required
        />
        <span className="text-sm font-medium truncate max-w-[30%]">{awayName}</span>
      </form>
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      {justSaved && <p className="text-sm text-green-600 text-center">{t("saved")}</p>}
      <button
        type="submit"
        onClick={onSubmit}
        disabled={pending}
        className="w-full rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {saved ? t("update") : t("submit")}
      </button>
      <LeaderboardLink label={t("leaderboardLink")} />
    </div>
  );
}

function LeaderboardLink({ label }: { label: string }) {
  return (
    <Link
      href="/peringkat"
      className="block text-center text-xs text-[var(--muted)] hover:text-[var(--brand)]"
    >
      {label}
    </Link>
  );
}
