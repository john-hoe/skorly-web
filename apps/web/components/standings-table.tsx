import type { StandingView } from "@skorly/db";
import { TeamBadge } from "./team-badge";

export function StandingsTable({ rows }: { rows: StandingView[] }) {
  if (!rows.length) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--card)] text-[var(--muted)]">
          <tr className="text-left">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Tim</th>
            <th className="px-2 py-2 text-center font-medium">M</th>
            <th className="px-2 py-2 text-center font-medium">SG</th>
            <th className="px-2 py-2 text-center font-medium">Poin</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team.slug || i} className="border-t border-[var(--border)]">
              <td className="px-3 py-2 text-[var(--muted)]">{r.rank ?? i + 1}</td>
              <td className="px-3 py-2">
                <TeamBadge name={r.team.name} logo={r.team.logo} code={r.team.code} size={22} />
              </td>
              <td className="px-2 py-2 text-center tabular-nums">{r.played}</td>
              <td className="px-2 py-2 text-center tabular-nums">{r.goalsFor - r.goalsAgainst}</td>
              <td className="px-2 py-2 text-center font-semibold tabular-nums">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
