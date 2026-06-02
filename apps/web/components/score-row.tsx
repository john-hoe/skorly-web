import { Link } from "@/i18n/navigation";
import type { ScoreRow as Row } from "@/lib/score-types";

/** Presentational score row — safe in both server and client components. */
export function ScoreRow({ row }: { row: Row }) {
  const live = row.status === "live";
  const finished = row.status === "finished";
  const hasScore = row.homeGoals != null && row.awayGoals != null;

  return (
    <Link
      href={{ pathname: "/pertandingan/[slug]", params: { slug: row.slug } }}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--background)]"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <TeamLine name={row.home.name} logo={row.home.logo} />
        <TeamLine name={row.away.name} logo={row.away.logo} />
      </div>

      <div className="flex flex-col items-end gap-1">
        {hasScore ? (
          <div className="text-right font-bold tabular-nums leading-tight">
            <div>{row.homeGoals}</div>
            <div>{row.awayGoals}</div>
          </div>
        ) : (
          <span className="text-xs text-[var(--muted)]">—</span>
        )}
      </div>

      <div className="w-12 shrink-0 text-right">
        {live ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            {row.elapsed != null ? `${row.elapsed}'` : "LIVE"}
          </span>
        ) : finished ? (
          <span className="text-xs font-semibold text-[var(--muted)]">FT</span>
        ) : null}
      </div>
    </Link>
  );
}

function TeamLine({ name, logo }: { name: string; logo: string | null }) {
  return (
    <div className="flex items-center gap-2">
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" />
      )}
      <span className="truncate text-sm font-medium">{name}</span>
    </div>
  );
}
