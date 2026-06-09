import type { Metadata } from "next";
import Link from "next/link";
import {
  getRuntimeAdminOverviewStats,
  type RuntimeAdminOverviewStats,
} from "@/lib/runtime-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Overview",
  robots: { index: false, follow: false },
};

type DistributionRow = {
  count: number;
  role?: string;
  locale?: string;
  type?: string;
};

const numberFormat = new Intl.NumberFormat("en");
const percentFormat = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
});

function formatNumber(value: number): string {
  return numberFormat.format(value);
}

function formatPercent(value: number, total: number): string {
  if (total <= 0) return "0%";
  return `${percentFormat.format((value / total) * 100)}%`;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function labelize(value: string): string {
  return value.replace(/_/g, " ");
}

function StatCard({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: "neutral" | "good" | "warning";
}) {
  const toneClass =
    tone === "good"
      ? "text-[var(--brand)]"
      : tone === "warning"
        ? "text-amber-600"
        : "text-[var(--foreground)]";

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="text-sm font-medium text-[var(--muted)]">{label}</div>
      <div className={`mt-2 text-2xl font-bold tracking-tight ${toneClass}`}>{value}</div>
      {helper ? <div className="mt-1 text-xs text-[var(--muted)]">{helper}</div> : null}
    </div>
  );
}

function DistributionPanel({
  title,
  rows,
  total,
  field,
}: {
  title: string;
  rows: DistributionRow[];
  total: number;
  field: "role" | "locale" | "type";
}) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <h2 className="text-sm font-semibold uppercase text-[var(--muted)]">{title}</h2>
      {total === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">No data yet</p>
      ) : null}
      <div className="mt-4 space-y-3">
        {total > 0 ? rows.map((row) => {
          const label = row[field] ?? "unknown";
          const pct = total > 0 ? Math.max(0, Math.min(100, (row.count / total) * 100)) : 0;
          return (
            <div key={label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium capitalize">{labelize(label)}</span>
                <span className="whitespace-nowrap text-[var(--muted)]">
                  {formatNumber(row.count)} · {formatPercent(row.count, total)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
                <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        }) : null}
      </div>
    </section>
  );
}

function ErrorState() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>
      </header>
      <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
        <h2 className="text-base font-semibold">Overview data unavailable</h2>
        <p className="mt-2 text-sm">Unable to load the overview metrics right now.</p>
      </section>
      <Link
        href="/admin/operations"
        className="inline-flex rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
      >
        Open operations
      </Link>
    </div>
  );
}

function OverviewDashboard({ stats }: { stats: RuntimeAdminOverviewStats }) {
  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Generated <time dateTime={stats.generatedAt.toISOString()}>{formatDate(stats.generatedAt)}</time>
          </p>
        </div>
        <Link
          href="/admin/operations"
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
        >
          Operations
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard
          label="Weekly active predictors"
          value={formatNumber(stats.predictions.weeklyActivePredictors)}
          helper="7d distinct users"
          tone="good"
        />
        <StatCard
          label="Predictions"
          value={formatNumber(stats.predictions.total)}
          helper={`${formatNumber(stats.predictions.last7d)} in 7d`}
        />
        <StatCard
          label="Users"
          value={formatNumber(stats.users.total)}
          helper={`${formatNumber(stats.users.new7d)} new in 7d`}
        />
        <StatCard
          label="Confirmed subscribers"
          value={formatNumber(stats.subscriptions.subscribersConfirmed)}
          helper={`${formatPercent(stats.subscriptions.subscribersConfirmed, stats.subscriptions.subscribersTotal)} confirmed`}
        />
        <StatCard
          label="Published in 48h"
          value={formatNumber(stats.content.publishedLast48h)}
          helper={`${formatNumber(stats.content.published)} total published`}
        />
        <StatCard
          label="Comment reports"
          value={formatNumber(stats.engagement.commentReportsTotal)}
          helper="all reports; no resolved state yet"
          tone={stats.engagement.commentReportsTotal > 0 ? "warning" : "neutral"}
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <StatCard
          label="Users new in 30d"
          value={formatNumber(stats.users.new30d)}
          helper={`${formatNumber(stats.users.deleted)} deleted profiles`}
        />
        <StatCard
          label="Predictions per active profile"
          value={formatNumber(stats.predictions.predictionsPerUser)}
          helper="total predictions / non-deleted profiles"
        />
        <StatCard
          label="Campaign entries"
          value={formatNumber(stats.campaigns.entriesTotal)}
          helper="all campaigns"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <DistributionPanel
          title="Users by role"
          rows={stats.users.byRole}
          total={stats.users.total}
          field="role"
        />
        <DistributionPanel
          title="Users by locale"
          rows={stats.users.byLocale}
          total={stats.users.total}
          field="locale"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard
            label="Subscribers"
            value={formatNumber(stats.subscriptions.subscribersTotal)}
            helper={`${formatNumber(stats.subscriptions.subscribersNew7d)} new in 7d`}
          />
          <StatCard
            label="Email subscribers"
            value={formatNumber(stats.subscriptions.subscribersEmail)}
            helper={`${formatNumber(stats.subscriptions.subscribersWhatsapp)} with WhatsApp`}
          />
          <StatCard
            label="Push subscriptions"
            value={formatNumber(stats.subscriptions.pushSubscriptions)}
            helper="browser push endpoints"
          />
          <StatCard
            label="Comments"
            value={formatNumber(stats.engagement.commentsTotal)}
            helper={`${formatNumber(stats.engagement.commentsLast7d)} in 7d`}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard
            label="Articles"
            value={formatNumber(stats.content.articlesTotal)}
            helper={`${formatNumber(stats.content.draft)} drafts`}
          />
          <StatCard
            label="Published articles"
            value={formatNumber(stats.content.published)}
            helper={`${formatPercent(stats.content.published, stats.content.articlesTotal)} published`}
          />
          <DistributionPanel
            title="Articles by locale"
            rows={stats.content.byLocale}
            total={stats.content.articlesTotal}
            field="locale"
          />
          <DistributionPanel
            title="Articles by type"
            rows={stats.content.byType}
            total={stats.content.articlesTotal}
            field="type"
          />
        </div>
      </section>
    </div>
  );
}

export default async function AdminPage() {
  const stats = await getRuntimeAdminOverviewStats().catch((error) => {
    console.warn("[admin] overview stats failed", error);
    return { error };
  });

  if ("error" in stats) return <ErrorState />;
  return <OverviewDashboard stats={stats} />;
}
