"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { saveBracketAction } from "@/lib/bracket-actions";
import type { TeamGroup, GroupTeam, BracketPicks } from "@skorly/db";

interface Props {
  groups: TeamGroup[];
  initial: BracketPicks | null;
  authed: boolean;
}

export function BracketBuilder({ groups, initial, authed }: Props) {
  const t = useTranslations("bracket");
  const [semifinalists, setSemis] = useState<number[]>(initial?.semifinalists ?? []);
  const [finalists, setFinalists] = useState<number[]>(initial?.finalists ?? []);
  const [champion, setChampion] = useState<number | null>(initial?.champion ?? null);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [pending, startTransition] = useTransition();

  const byId = useMemo(() => {
    const m = new Map<number, GroupTeam>();
    for (const g of groups) for (const tm of g.teams) m.set(tm.id, tm);
    return m;
  }, [groups]);

  function toggleSemi(id: number) {
    setError(null);
    setSavedOk(false);
    if (semifinalists.includes(id)) {
      setSemis((s) => s.filter((x) => x !== id));
      setFinalists((f) => f.filter((x) => x !== id));
      if (champion === id) setChampion(null);
    } else if (semifinalists.length < 4) {
      setSemis((s) => [...s, id]);
    }
  }

  function toggleFinalist(id: number) {
    setError(null);
    setSavedOk(false);
    if (finalists.includes(id)) {
      setFinalists((f) => f.filter((x) => x !== id));
      if (champion === id) setChampion(null);
    } else if (finalists.length < 2) {
      setFinalists((f) => [...f, id]);
    }
  }

  const complete =
    semifinalists.length === 4 && finalists.length === 2 && champion != null;

  function onSave() {
    if (!complete) return;
    setError(null);
    startTransition(async () => {
      const res = await saveBracketAction({ semifinalists, finalists, champion });
      if (res.ok) {
        setSavedOk(true);
      } else if (res.error === "unauth") {
        setError(t("loginToSave"));
      } else {
        setError(t(`errors.${res.error}`));
      }
    });
  }

  const label = (tm: GroupTeam) => tm.code?.trim() || tm.name;
  const shareText =
    champion != null
      ? t("shareText", {
          champion: byId.get(champion)?.name ?? "",
        })
      : "";

  return (
    <div className="space-y-6">
      {/* Live bracket summary */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
        <Stage n={1} title={t("pickFinalFour")} done={semifinalists.length === 4}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => {
              const id = semifinalists[i];
              const tm = id != null ? byId.get(id) : undefined;
              return (
                <Slot key={i} filled={!!tm}>
                  {tm ? (
                    <button
                      type="button"
                      onClick={() => toggleSemi(tm.id)}
                      className="flex w-full items-center justify-center gap-1.5"
                      aria-label={`Remove ${tm.name}`}
                    >
                      <TeamChip tm={tm} />
                      <span className="text-[var(--muted)]">✕</span>
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">{t("slotEmpty")}</span>
                  )}
                </Slot>
              );
            })}
          </div>
        </Stage>

        {semifinalists.length === 4 && (
          <Stage n={2} title={t("pickFinalists")} done={finalists.length === 2}>
            <div className="flex flex-wrap gap-2">
              {semifinalists.map((id) => {
                const tm = byId.get(id)!;
                const on = finalists.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleFinalist(id)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      on
                        ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                        : "border-[var(--border)] hover:border-[var(--brand)]"
                    }`}
                  >
                    {label(tm)}
                  </button>
                );
              })}
            </div>
          </Stage>
        )}

        {finalists.length === 2 && (
          <Stage n={3} title={t("pickChampion")} done={champion != null}>
            <div className="flex flex-wrap gap-2">
              {finalists.map((id) => {
                const tm = byId.get(id)!;
                const on = champion === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setChampion(id);
                      setSavedOk(false);
                    }}
                    className={`rounded-full border px-4 py-1.5 text-sm font-bold transition ${
                      on
                        ? "border-yellow-500 bg-yellow-400 text-black"
                        : "border-[var(--border)] hover:border-yellow-500"
                    }`}
                  >
                    {on ? "👑 " : ""}
                    {label(tm)}
                  </button>
                );
              })}
            </div>
          </Stage>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
        {savedOk && <p className="text-sm text-green-600">{t("saved")}</p>}

        {authed ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={!complete || pending}
              className="rounded-lg bg-[var(--brand)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-50"
            >
              {initial ? t("update") : t("save")}
            </button>
            {savedOk && shareText && (
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:border-[var(--brand)]"
              >
                {t("share")}
              </a>
            )}
          </div>
        ) : (
          <Link
            href="/masuk"
            className="inline-block rounded-lg bg-[var(--brand)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
          >
            {t("loginToSave")}
          </Link>
        )}
      </div>

      {/* Team picker */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[var(--muted)]">{t("chooseTeams")}</h2>
        {groups.map((g) => (
          <div key={g.group} className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
              {g.group}
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {g.teams.map((tm) => {
                const selected = semifinalists.includes(tm.id);
                const disabled = !selected && semifinalists.length >= 4;
                return (
                  <button
                    key={tm.id}
                    type="button"
                    onClick={() => toggleSemi(tm.id)}
                    disabled={disabled}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                      selected
                        ? "border-[var(--brand)] bg-[var(--brand)]/10 font-semibold"
                        : "border-[var(--border)] hover:border-[var(--brand)] disabled:opacity-40"
                    }`}
                  >
                    <TeamChip tm={tm} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stage({
  n,
  title,
  done,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
            done ? "bg-green-500 text-white" : "bg-[var(--border)] text-[var(--muted)]"
          }`}
        >
          {done ? "✓" : n}
        </span>
        {title}
      </div>
      {children}
    </div>
  );
}

function Slot({ filled, children }: { filled: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`flex h-12 items-center justify-center rounded-lg border px-2 text-sm ${
        filled ? "border-[var(--brand)] bg-[var(--brand)]/10" : "border-dashed border-[var(--border)]"
      }`}
    >
      {children}
    </div>
  );
}

function TeamChip({ tm }: { tm: GroupTeam }) {
  return (
    <span className="flex items-center gap-1.5 truncate">
      {tm.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tm.logo} alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" />
      )}
      <span className="truncate">{tm.name}</span>
    </span>
  );
}
