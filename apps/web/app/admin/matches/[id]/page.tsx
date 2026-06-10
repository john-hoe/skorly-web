import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  runAdminOperation,
  setAdminMatchStatus,
  type AdminMatchManagementResult,
  type RunAdminOperationResult,
} from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/admin";
import {
  getRuntimeAdminMatch,
  getRuntimeAdminMatchEvents,
  getRuntimeAdminMatchStandings,
  type RuntimeAdminMatchBasic,
  type RuntimeAdminMatchEvent,
  type RuntimeAdminMatchStatus,
  type RuntimeAdminStandingRow,
} from "@/lib/runtime-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Match",
  robots: { index: false, follow: false },
};

const MATCH_STATUSES: RuntimeAdminMatchStatus[] = [
  "scheduled",
  "live",
  "finished",
  "postponed",
  "cancelled",
];

type SearchParams = {
  notice?: string;
  error?: string;
};

type AdminMatchManagementError = Extract<AdminMatchManagementResult, { ok: false }>["error"];

function matchAdminHref(matchId: number, input: { notice?: string; error?: string } = {}) {
  const params = new URLSearchParams();
  if (input.notice) params.set("notice", input.notice);
  if (input.error) params.set("error", input.error);
  const query = params.toString();
  const path = Number.isInteger(matchId) && matchId > 0 ? `/admin/matches/${matchId}` : "/admin/matches";
  return query ? `${path}?${query}` : path;
}

function matchResultParams(result: AdminMatchManagementResult): { notice?: string; error?: string } {
  if (result.ok) return { notice: "Match status updated" };
  const messages: Record<AdminMatchManagementError, string> = {
    invalid: "Invalid match status change",
    audit: "Audit log write failed",
    upstream: "Database update failed",
    notFound: "Match not found",
    confirmStatus: "Type STATUS to confirm status changes",
  };
  return { error: messages[result.error] ?? "Match change failed" };
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

function returnPathFromForm(formData: FormData, fallbackMatchId: number): string {
  const value = String(formData.get("returnTo") ?? "");
  const fallback = matchAdminHref(fallbackMatchId);
  if (!Number.isInteger(fallbackMatchId) || fallbackMatchId <= 0) return fallback;
  try {
    const url = new URL(value, "https://skorly.local");
    if (
      url.origin !== "https://skorly.local" ||
      url.pathname !== `/admin/matches/${fallbackMatchId}`
    ) {
      return fallback;
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

function redirectWithParams(returnTo: string, params: { notice?: string; error?: string }): never {
  const url = new URL(returnTo, "https://skorly.local");
  url.searchParams.delete("notice");
  url.searchParams.delete("error");
  if (params.notice) url.searchParams.set("notice", params.notice);
  if (params.error) url.searchParams.set("error", params.error);
  redirect(`${url.pathname}${url.search}`);
}

async function setMatchStatusAction(formData: FormData): Promise<void> {
  "use server";
  const matchId = Number(formData.get("matchId"));
  const returnTo = returnPathFromForm(formData, matchId);
  const result = await setAdminMatchStatus(
    matchId,
    String(formData.get("status") ?? ""),
    { confirmStatus: String(formData.get("statusConfirm") ?? "") === "STATUS" },
  );
  redirectWithParams(returnTo, matchResultParams(result));
}

async function runMatchOperationAction(formData: FormData): Promise<void> {
  "use server";
  const matchId = Number(formData.get("matchId"));
  const operation = String(formData.get("operation") ?? "");
  const returnTo = returnPathFromForm(formData, matchId);
  const result =
    operation === "live" || operation === "ingest"
      ? await runAdminOperation(operation)
      : ({ ok: false, operation: undefined, error: "invalid" } as RunAdminOperationResult);
  redirectWithParams(returnTo, operationResultParams(result));
}

function formatDate(value: Date | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function scoreLabel(match: Pick<RuntimeAdminMatchBasic, "homeGoals" | "awayGoals" | "status">): string {
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

function StatusForm({ match, returnTo }: { match: RuntimeAdminMatchBasic; returnTo: string }) {
  return (
    <form action={setMatchStatusAction} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <input type="hidden" name="matchId" value={match.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <h2 className="text-base font-semibold">Status</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <select
          name="status"
          defaultValue={match.status}
          className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
        >
          {MATCH_STATUSES.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <input
          name="statusConfirm"
          autoComplete="off"
          placeholder="Enter STATUS to confirm"
          className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--background)]"
        >
          Set status
        </button>
      </div>
    </form>
  );
}

function OperationPanel({ match, returnTo }: { match: RuntimeAdminMatchBasic; returnTo: string }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <h2 className="text-base font-semibold">Operations</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <form action={runMatchOperationAction}>
          <input type="hidden" name="matchId" value={match.id} />
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
          <input type="hidden" name="matchId" value={match.id} />
          <input type="hidden" name="operation" value="ingest" />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button
            type="submit"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--background)]"
          >
            Run full ingest
          </button>
        </form>
      </div>
    </section>
  );
}

function MatchMeta({ match }: { match: RuntimeAdminMatchBasic }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <h2 className="text-base font-semibold">Metadata</h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase text-[var(--muted)]">ID</dt>
          <dd className="mt-1 font-mono">{match.id}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-[var(--muted)]">API ID</dt>
          <dd className="mt-1 font-mono">{match.apiId}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-[var(--muted)]">Slug</dt>
          <dd className="mt-1 break-all font-mono">{match.slug}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-[var(--muted)]">Group / Stage</dt>
          <dd className="mt-1">{match.groupName ?? "-"} / {match.stage ?? match.round ?? "-"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-[var(--muted)]">Kickoff</dt>
          <dd className="mt-1">{formatDate(match.kickoffAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-[var(--muted)]">Venue</dt>
          <dd className="mt-1">{match.venue ?? "-"}{match.city ? `, ${match.city}` : ""}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-[var(--muted)]">Notification</dt>
          <dd className="mt-1">{formatDate(match.notifiedKickoffAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-[var(--muted)]">Premium email</dt>
          <dd className="mt-1">{formatDate(match.premiumEmailedAt)}</dd>
        </div>
      </dl>
    </section>
  );
}

function EventsTable({ events }: { events: RuntimeAdminMatchEvent[] }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-base font-semibold">Events</h2>
      </div>
      {events.length === 0 ? (
        <p className="px-4 py-6 text-sm text-[var(--muted)]">No fixture events stored.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Minute</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Team</th>
                <th className="px-4 py-3 font-semibold">Player</th>
                <th className="px-4 py-3 font-semibold">Detail</th>
                <th className="px-4 py-3 font-semibold">Notified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">
                    {event.minute == null ? "-" : `${event.minute}'`}
                  </td>
                  <td className="px-4 py-3">{event.type ?? "-"}</td>
                  <td className="px-4 py-3">{event.teamName ?? "-"}</td>
                  <td className="px-4 py-3">{event.playerName ?? "-"}</td>
                  <td className="min-w-48 px-4 py-3 text-[var(--muted)]">{event.detail ?? "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">
                    {formatDate(event.notifiedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function StandingsTable({ rows }: { rows: RuntimeAdminStandingRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-base font-semibold">{rows[0]?.groupName ?? "Group"} standings</h2>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function AdminMatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  await requireAdmin();
  const matchId = Number(id);
  if (!Number.isInteger(matchId) || matchId <= 0) notFound();

  let match: RuntimeAdminMatchBasic | null = null;
  let unavailable = false;
  try {
    match = await getRuntimeAdminMatch(matchId);
  } catch (error) {
    console.warn("[admin] match detail query failed", error);
    unavailable = true;
  }
  if (!match && !unavailable) notFound();
  const returnTo = matchAdminHref(matchId);

  const [events, standings] = match
    ? await Promise.all([
        getRuntimeAdminMatchEvents(match.id).catch((error) => {
          console.warn("[admin] match events query failed", error);
          return [];
        }),
        getRuntimeAdminMatchStandings(match.groupName).catch((error) => {
          console.warn("[admin] match standings query failed", error);
          return [];
        }),
      ])
    : [[], []];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <Link href="/admin/matches" className="text-sm font-semibold text-[var(--brand)] hover:underline">
            Matches
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            {match ? `${match.home.name} vs ${match.away.name}` : "Match"}
          </h1>
          {match ? (
            <p className="text-sm text-[var(--muted)]">
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(match.status)}`}>
                {match.status}
              </span>
              <span className="ml-2">{scoreLabel(match)} · {formatDate(match.kickoffAt)}</span>
            </p>
          ) : null}
        </div>
        {match ? (
          <Link
            href={`/id/pertandingan/${match.slug}`}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--card)]"
          >
            View public
          </Link>
        ) : null}
      </header>

      <Notice notice={query.notice} error={query.error} />

      {match ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="space-y-6">
              <StatusForm match={match} returnTo={returnTo} />
              <EventsTable events={events} />
              <StandingsTable rows={standings} />
            </div>
            <aside className="space-y-6">
              <OperationPanel match={match} returnTo={returnTo} />
              <MatchMeta match={match} />
            </aside>
          </div>
        </>
      ) : (
        <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900">
          <h2 className="text-base font-semibold">Match unavailable</h2>
          <p className="mt-2 text-sm">Unable to load this fixture right now.</p>
        </section>
      )}
    </div>
  );
}
