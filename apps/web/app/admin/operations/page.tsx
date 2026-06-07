import type { Metadata } from "next";
import { getRecentAdminAuditLogs } from "@skorly/db";
import { OperationsPanel } from "@/components/admin/operations-panel";

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

export default async function AdminOperationsPage() {
  const logs = await getRecentAdminAuditLogs(12).catch((error) => {
    console.warn("[admin] recent audit logs failed", error);
    return [];
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Operations</h1>
        <p className="text-sm text-[var(--muted)]">Manual jobs triggers</p>
      </header>

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
