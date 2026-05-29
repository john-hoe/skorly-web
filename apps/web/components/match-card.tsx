import type { FixtureView } from "@skorly/db";
import { Link } from "@/i18n/navigation";
import { TeamBadge } from "./team-badge";

function formatKickoff(d: Date | null): string {
  if (!d) return "TBD";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function MatchCard({ fixture }: { fixture: FixtureView }) {
  const finished = fixture.status === "finished";
  const live = fixture.status === "live";

  return (
    <Link
      href={{ pathname: "/pertandingan/[slug]", params: { slug: fixture.slug } }}
      className="block rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition hover:border-[var(--brand)] hover:shadow-sm"
    >
      <div className="flex items-center justify-between text-xs text-[var(--muted)] mb-3">
        <span>{fixture.groupName ?? fixture.round ?? ""}</span>
        {live ? (
          <span className="inline-flex items-center gap-1 font-semibold text-[var(--brand)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)] animate-pulse" />
            {fixture.elapsed ? `${fixture.elapsed}'` : "LIVE"}
          </span>
        ) : (
          <span>{formatKickoff(fixture.kickoffAt)} WIB</span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex justify-end">
          <TeamBadge name={fixture.home.name} logo={fixture.home.logo} code={fixture.home.code} reverse />
        </div>
        <div className="px-3 text-center font-bold tabular-nums">
          {finished || live ? (
            <span>
              {fixture.homeGoals ?? 0} <span className="text-[var(--muted)]">-</span>{" "}
              {fixture.awayGoals ?? 0}
            </span>
          ) : (
            <span className="text-[var(--muted)] text-sm">vs</span>
          )}
        </div>
        <div className="flex justify-start">
          <TeamBadge name={fixture.away.name} logo={fixture.away.logo} code={fixture.away.code} />
        </div>
      </div>
    </Link>
  );
}
