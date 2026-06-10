import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { runAdminOperation, type RunAdminOperationResult } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/admin";
import {
  getRuntimeAdminMatches,
  getRuntimeAdminMatchStandings,
  getRuntimeGroupNames,
  type RuntimeAdminMatchList,
  type RuntimeAdminMatchListItem,
  type RuntimeAdminMatchStatus,
  type RuntimeAdminMatchStatusFilter,
  type RuntimeAdminMatchWindow,
  type RuntimeAdminStandingRow,
} from "@/lib/runtime-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Matches",
  robots: { index: false, follow: false },
};

const MATCH_STATUSES: Array<{ value: RuntimeAdminMatchStatusFilter; label: string }> = [
  { value: "all", label: "All status" },
  { value: "scheduled", label: "Scheduled" },
  { value: "live", label: "Live" },
  { value: "finished", label: "Finished" },
  { value: "postponed", label: "Postponed" },
  { value: "cancelled", label: "Cancelled" },
];
const MATCH_WINDOWS: Array<{ value: RuntimeAdminMatchWindow; label: string }> = [
  { value: "upcoming", label: "Upcoming window" },
  { value: "past", label: "Past matches" },
  { value: "all", label: "All dates" },
];

type SearchParams = {
  q?: string;
  status?: string;
  window?: string;
  group?: string;
  page?: string;
  notice?: string;
  error?: string;
};

function normalizeStatus(value: string | undefined): RuntimeAdminMatchStatusFilter {
  if (
    value === "scheduled" ||
    value === "live" ||
    value === "finished" ||
    value === "postponed" ||
    value === "cancelled"
  ) {
    return value;
  }
  return "all";
}

function normalizeWindow(
  value: string | undefined,
  status: RuntimeAdminMatchStatusFilter,
): RuntimeAdminMatchWindow {
  if (value === "past" || value === "all" || value === "upcoming") return value;
  return status === "all" ? "upcoming" : "all";
}

function normalizeGroup(value: string | undefined): string {
  const next = (value ?? "")
    .trim()
    .replace(/[%_*(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return next || "all";
}

function normalizePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function matchesHref(input: {
  q?: string;
  status?: RuntimeAdminMatchStatusFilter;
  window?: RuntimeAdminMatchWindow;
  group?: string;
  page?: number;
  notice?: string;
  error?: string;
}) {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  if (input.status && input.status !== "all") params.set("status", input.status);
  if (input.window && input.window !== "upcoming") params.set("window", input.window);
  if (input.group && input.group !== "all") params.set("group", input.group);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  if (input.notice) params.set("notice", input.notice);
  if (input.error) params.set("error", input.error);
  const query = params.toString();
  return query ? `/admin/matches?${query}` : "/admin/matches";
}

function operationResultParams(result: RunAdminOperationResult): { notice?: string; error?: string } {
  if (result.ok) {
    const label = result.operation === "live" ? "Live ingest completed" : "Fixture ingest completed";
    return { notice: `${label} (${result.status})` };
  }
  if (result.error === "notConfigured") return { error: "Missing JOBS_ADMIN_URL or JOBS_ADMIN_SECRET" };
  if (result.error === "audit") return { error: "Audit log write failed" };
  if (result.error === "invalid") return { error: "Invalid operation" };
  return { error: result.status ? `Job failed with ${result.status}` : "Job failed" };
}

function returnPathFromForm(formData: FormData): string {
  const value = String(formData.get("returnTo") ?? "");
  try {
    const url = new URL(value, "https://skorly.local");
    if (url.origin !== "https://skorly.local" || url.pathname !== "/admin/matches") {
      return "/admin/matches";
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return "/admin/matches";
  }
}

function redirectWithOperationResult(returnTo: string, result: RunAdminOperationResult): never {
  const url = new URL(returnTo, "https://skorly.local");
  const params = operationResultParams(result);
  url.searchParams.delete("notice");
  url.searchParams.delete("error");
  if (params.notice) url.searchParams.set("notice", params.notice);
  if (params.error) url.searchParams.set("error", params.error);
  redirect(`${url.pathname}${url.search}`);
}

async function runMatchOperationAction(formData: FormData): Promise<void> {
  "use server";
  const operation = String(formData.get("operation") ?? "");
  const returnTo = returnPathFromForm(formData);
  const result =
    operation === "live" || operation === "ingest"
      ? await runAdminOperation(operation)
      : ({ ok: false, operation: undefined, error: "invalid" } as RunAdminOperationResult);
  redirectWithOperationResult(returnTo, result);
}

function formatDate(value: Date | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function scoreLabel(match: Pick<RuntimeAdminMatchListItem, "homeGoals" | "awayGoals" | "status">): string {
  if (match.homeGoals == null || match.awayGoals == null) {
    return match.status === "scheduled" ? "-" : "0 - 0";
  }
  return `${match.homeGoals} - ${match.awayGoals}`;
}

function statusClass(status: RuntimeAdminMatchStatus): string {
  if (status === "live") return "bg-red-100 text-red-700";
  if (status === "finished") return "bg-emerald-100 text-emerald-700";
  if (status === "postponed" || status === "cancelled") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

function Notice({ notice, error }: { notice?: string; error?: string }) {
  if (!notice && !error) return null;
  return (
    <section
      className={
        error
          ? "rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-900"
          : "rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900"
      }
    >
      {error ?? notice}
    </section>
  );
}

function OperationButtons({ returnTo }: { returnTo: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={runMatchOperationAction}>
        <input type="hidden" name="operation" value="live" />
        <input type="hidden" name="returnTo" value={returnTo} />
        <button
          type="submit"
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
        >
          Run live ingest
        </button>
      </form>
      <form action={runMatchOperationAction}>
        <input type="hidden" name="operation" value="ingest" />
        <input type="hidden" name="returnTo" value={returnTo} />
        <button
          type="submit"
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--card)]"
        >
          Run full ingest
        </button>
      </form>
    </div>
  );
}

function MatchesFilters({
  q,
  status,
  window,
  group,
  groups,
}: {
  q: string;
  status: RuntimeAdminMatchStatusFilter;
  window: RuntimeAdminMatchWindow;
  group: string;
  groups: string[];
}) {
  return (
    <form action="/admin/matches" className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 xl:grid-cols-[minmax(0,1fr)_12rem_12rem_10rem_auto]">
      <input
        name="q"
        defaultValue={q}
        placeholder="Search slug, round, stage, venue, city"
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--brand)]"
      />
      <select
        name="status"
        defaultValue={status}
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
      >
        {MATCH_STATUSES.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
      <select
        name="window"
        defaultValue={window}
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
      >
        {MATCH_WINDOWS.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
      <select
        name="group"
        defaultValue={group}
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
      >
        <option value="all">All groups</option>
        {groups.map((item) => (
          <option key={item} value={item}>{item.replace(/^Group /, "")}</option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
      >
        Search
      </button>
    </form>
  );
}

function MatchesTable({ data }: { data: RuntimeAdminMatchList }) {
  if (data.matches.length === 0) {
    return (
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <h2 className="text-base font-semibold">No matches found</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Adjust the search or filters.</p>
      </section>
    );
  }

  return (
    <section className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]">
          <tr>
            <th className="px-4 py-3 font-semibold">Match</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Score</th>
            <th className="px-4 py-3 font-semibold">Stage</th>
            <th className="px-4 py-3 font-semibold">Kickoff</th>
            <th className="px-4 py-3 font-semibold">Events</th>
            <th className="px-4 py-3 font-semibold">Updated</th>
            <th className="px-4 py-3 font-semibold">Manage</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {data.matches.map((match) => (
            <tr key={match.id}>
              <td className="min-w-72 px-4 py-4 align-top">
                <div className="font-semibold">{match.home.name} vs {match.away.name}</div>
                <div className="mt-1 font-mono text-xs text-[var(--muted)]">{match.slug}</div>
                <div className="mt-1 text-xs text-[var(--muted)]">API {match.apiId} · DB {match.id}</div>
              </td>
              <td className="px-4 py-4 align-top">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(match.status)}`}>
                  {match.status}
                </span>
                {match.elapsed != null ? (
                  <div className="mt-2 text-xs text-[var(--muted)]">{match.elapsed} min elapsed</div>
                ) : null}
              </td>
              <td className="whitespace-nowrap px-4 py-4 align-top font-semibold">
                {scoreLabel(match)}
              </td>
              <td className="min-w-40 px-4 py-4 align-top text-[var(--muted)]">
                <div>{match.groupName ?? "-"}</div>
                <div className="mt-1 text-xs">{match.stage ?? match.round ?? "-"}</div>
              </td>
              <td className="whitespace-nowrap px-4 py-4 align-top text-[var(--muted)]">
                {formatDate(match.kickoffAt)}
              </td>
              <td className="px-4 py-4 align-top">
                <span className="font-semibold">{match.eventCount}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-4 align-top text-[var(--muted)]">
                {formatDate(match.updatedAt)}
              </td>
              <td className="px-4 py-4 align-top">
                <Link
                  href={`/admin/matches/${match.id}`}
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--background)]"
                >
                  Manage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function StandingsSnapshot({
  group,
  rows,
}: {
  group: string;
  rows: RuntimeAdminStandingRow[];
}) {
  if (rows.length === 0) return null;
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-base font-semibold">{group} standings</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Rank</th>
              <th className="px-4 py-3 font-semibold">Team</th>
              <th className="px-4 py-3 font-semibold">P</th>
              <th className="px-4 py-3 font-semibold">W</th>
              <th className="px-4 py-3 font-semibold">D</th>
              <th className="px-4 py-3 font-semibold">L</th>
              <th className="px-4 py-3 font-semibold">GF</th>
              <th className="px-4 py-3 font-semibold">GA</th>
              <th className="px-4 py-3 font-semibold">GD</th>
              <th className="px-4 py-3 font-semibold">Pts</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row) => (
              <tr key={`${row.groupName}:${row.teamId}`}>
                <td className="px-4 py-3 font-semibold">{row.rank ?? "-"}</td>
                <td className="px-4 py-3">{row.team.name}</td>
                <td className="px-4 py-3">{row.played}</td>
                <td className="px-4 py-3">{row.win}</td>
                <td className="px-4 py-3">{row.draw}</td>
                <td className="px-4 py-3">{row.lose}</td>
                <td className="px-4 py-3">{row.goalsFor}</td>
                <td className="px-4 py-3">{row.goalsAgainst}</td>
                <td className="px-4 py-3">{row.goalsFor - row.goalsAgainst}</td>
                <td className="px-4 py-3 font-semibold">{row.points}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{formatDate(row.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Pagination({ data }: { data: RuntimeAdminMatchList }) {
  if (data.totalPages <= 1) return null;
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="text-[var(--muted)]">
        Page {data.page} of {data.totalPages}
      </div>
      <div className="flex gap-2">
        {data.page > 1 ? (
          <Link
            href={matchesHref({
              q: data.query,
              status: data.status,
              window: data.window,
              group: data.group,
              page: data.page - 1,
            })}
            className="rounded-lg border border-[var(--border)] px-3 py-2 font-semibold hover:bg-[var(--card)]"
          >
            Previous
          </Link>
        ) : null}
        {data.page < data.totalPages ? (
          <Link
            href={matchesHref({
              q: data.query,
              status: data.status,
              window: data.window,
              group: data.group,
              page: data.page + 1,
            })}
            className="rounded-lg border border-[var(--border)] px-3 py-2 font-semibold hover:bg-[var(--card)]"
          >
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  await requireAdmin();
  const q = (params.q ?? "").trim().slice(0, 120);
  const status = normalizeStatus(params.status);
  const window = normalizeWindow(params.window, status);
  const group = normalizeGroup(params.group);
  const page = normalizePage(params.page);
  const returnTo = matchesHref({ q, status, window, group, page });

  const [groups, data] = await Promise.all([
    getRuntimeGroupNames().catch((error) => {
      console.warn("[admin] match groups query failed", error);
      return [];
    }),
    getRuntimeAdminMatches({ query: q, status, window, group, page }).catch((error) => {
      console.warn("[admin] matches query failed", error);
      return null;
    }),
  ]);
  const standingsGroup =
    data?.group !== "all" ? data?.group ?? null : data?.matches.find((match) => match.groupName)?.groupName ?? null;
  const standings = standingsGroup
    ? await getRuntimeAdminMatchStandings(standingsGroup).catch((error) => {
        console.warn("[admin] match standings query failed", error);
        return [];
      })
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Matches</h1>
          <p className="text-sm text-[var(--muted)]">
            Review fixture state, event ingestion, and group standings.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {data ? (
            <div className="text-sm text-[var(--muted)]">
              <span className="font-semibold text-[var(--foreground)]">{data.total}</span> matching matches
            </div>
          ) : null}
          <OperationButtons returnTo={returnTo} />
        </div>
      </header>

      <Notice notice={params.notice} error={params.error} />
      <MatchesFilters q={q} status={status} window={window} group={group} groups={groups} />

      {data ? (
        <>
          <MatchesTable data={data} />
          <Pagination data={data} />
          {standingsGroup ? <StandingsSnapshot group={standingsGroup} rows={standings} /> : null}
        </>
      ) : (
        <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900">
          <h2 className="text-base font-semibold">Matches unavailable</h2>
          <p className="mt-2 text-sm">Unable to load fixture records right now.</p>
        </section>
      )}
    </div>
  );
}
