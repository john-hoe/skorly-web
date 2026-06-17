import type { Metadata } from "next";
import { OperationsPanel } from "@/components/admin/operations-panel";
import {
  getRuntimeNewsPipelineReport,
  getRuntimeRecentAdminAuditLogs,
  type RuntimeNewsPipelineHealthStatus,
  type RuntimeNewsPipelineReport,
} from "@/lib/runtime-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Operations",
  robots: { index: false, follow: false },
};

function formatDate(value: Date | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function statusFromMeta(meta: Record<string, unknown> | null): string {
  const status = meta?.status;
  return typeof status === "string" ? status.replace(/_/g, " ") : "-";
}

function formatPercent(value: number | null): string {
  return value == null ? "n/a" : `${Math.round(value * 100)}%`;
}

function pipelineStatusClass(status: RuntimeNewsPipelineHealthStatus): string {
  if (status === "healthy") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
  if (status === "degraded") return "border-amber-500/30 bg-amber-500/10 text-amber-700";
  return "border-red-500/30 bg-red-500/10 text-red-700";
}

function NewsPipelinePanel({ report }: { report: RuntimeNewsPipelineReport | null }) {
  if (!report) {
    return (
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-5">
        <h2 className="text-base font-semibold">News pipeline</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Report unavailable</p>
      </section>
    );
  }

  const stats = [
    { label: "Signals", value: report.signalsInserted },
    { label: "Pending topics", value: report.pendingTopics },
    { label: "Attempted", value: report.attemptedTopics },
    { label: "Published", value: report.publishedTopics },
    { label: "Draft/skipped", value: report.draftOrSkippedTopics },
    { label: "Publish rate", value: formatPercent(report.publishRate) },
  ];

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">News pipeline</h2>
          <p className="text-xs text-[var(--muted)]">
            {report.hours}h window · generated {formatDate(report.generatedAt)}
          </p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${pipelineStatusClass(
            report.status,
          )}`}
        >
          {report.status}
        </span>
      </div>

      <div className="grid gap-px bg-[var(--border)] md:grid-cols-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[var(--card)] px-4 py-3">
            <div className="text-xs uppercase text-[var(--muted)]">{stat.label}</div>
            <div className="mt-1 text-xl font-semibold">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 px-4 py-4 md:grid-cols-3">
        <div>
          <h3 className="text-sm font-semibold">Draft reasons</h3>
          {report.draftReasons.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">No draft reasons</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {report.draftReasons.slice(0, 5).map((reason) => (
                <li key={reason.code} className="flex items-center justify-between gap-3">
                  <span className="truncate text-[var(--muted)]">{reason.label}</span>
                  <span className="font-semibold">{reason.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold">Signals</h3>
          {report.signalsBySource.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">No signals</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {report.signalsBySource.map((row) => (
                <li key={row.source} className="flex items-center justify-between gap-3">
                  <span className="truncate text-[var(--muted)]">{row.source}</span>
                  <span className="font-semibold">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold">Diagnosis</h3>
          <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
            {report.diagnostics.slice(0, 3).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default async function AdminOperationsPage() {
  const targetTopics = Number(process.env.NEWS_PIPELINE_TOPIC_TARGET ?? 6);
  const [report, logs] = await Promise.all([
    getRuntimeNewsPipelineReport(
      24,
      Number.isFinite(targetTopics) ? targetTopics : 6,
    ).catch((error) => {
      console.warn("[admin] news pipeline report failed", error);
      return null;
    }),
    getRuntimeRecentAdminAuditLogs(12).catch((error) => {
      console.warn("[admin] recent audit logs failed", error);
      return [];
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Operations</h1>
        <p className="text-sm text-[var(--muted)]">Manual jobs triggers</p>
      </header>

      <NewsPipelinePanel report={report} />

      <OperationsPanel />

      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-base font-semibold">Recent audit log</h2>
        </div>
        {logs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--muted)]">No audit entries</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Time</th>
                  <th className="px-4 py-3 font-semibold">Actor</th>
                  <th className="px-4 py-3 font-semibold">Target</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {log.actorName ?? log.actorEmail ?? log.actorId}
                    </td>
                    <td className="px-4 py-3 font-medium">{log.target}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {statusFromMeta(log.meta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
