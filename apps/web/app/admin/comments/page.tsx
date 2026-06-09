import type { Metadata } from "next";
import Link from "next/link";
import {
  reviewAdminCommentReports,
  setAdminCommentHidden,
} from "@/lib/admin-actions";
import {
  getRuntimeAdminCommentModerationItems,
  type RuntimeAdminCommentModerationItem,
  type RuntimeAdminCommentModerationStatus,
} from "@/lib/runtime-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Comments",
  robots: { index: false, follow: false },
};

const STATUS_TABS: Array<{ status: RuntimeAdminCommentModerationStatus; label: string }> = [
  { status: "pending", label: "Pending reports" },
  { status: "all", label: "All reported" },
  { status: "hidden", label: "Hidden comments" },
];

function statusFromSearch(value: string | undefined): RuntimeAdminCommentModerationStatus {
  if (value === "all" || value === "hidden") return value;
  return "pending";
}

function formatDate(value: Date | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function authorLabel(item: RuntimeAdminCommentModerationItem): string {
  return item.author.name ?? item.author.email ?? item.author.id;
}

function targetHref(status: RuntimeAdminCommentModerationStatus): string {
  return status === "pending" ? "/admin/comments" : `/admin/comments?status=${status}`;
}

async function hideCommentAction(commentId: number): Promise<void> {
  "use server";
  await setAdminCommentHidden(commentId, true);
}

async function unhideCommentAction(commentId: number): Promise<void> {
  "use server";
  await setAdminCommentHidden(commentId, false);
}

async function reviewReportsAction(commentId: number): Promise<void> {
  "use server";
  await reviewAdminCommentReports(commentId);
}

function StatusTabs({ active }: { active: RuntimeAdminCommentModerationStatus }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {STATUS_TABS.map((tab) => {
        const selected = tab.status === active;
        return (
          <Link
            key={tab.status}
            href={targetHref(tab.status)}
            className={
              selected
                ? "rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white"
                : "rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ModerationActions({ item }: { item: RuntimeAdminCommentModerationItem }) {
  return (
    <div className="flex flex-wrap gap-2">
      {item.isHidden ? (
        <form action={unhideCommentAction.bind(null, item.commentId)}>
          <button
            type="submit"
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--background)]"
          >
            Unhide
          </button>
        </form>
      ) : (
        <form action={hideCommentAction.bind(null, item.commentId)}>
          <button
            type="submit"
            className="rounded-lg border border-red-500 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-500 hover:text-white"
          >
            Hide
          </button>
        </form>
      )}
      {item.pendingReportCount > 0 ? (
        <form action={reviewReportsAction.bind(null, item.commentId)}>
          <button
            type="submit"
            className="rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
          >
            Mark reviewed
          </button>
        </form>
      ) : (
        <span className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--muted)]">
          Reviewed
        </span>
      )}
    </div>
  );
}

function CommentCard({ item }: { item: RuntimeAdminCommentModerationItem }) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">Comment #{item.commentId}</h2>
            {item.isHidden ? (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                hidden
              </span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                visible
              </span>
            )}
            {item.pendingReportCount > 0 ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                {item.pendingReportCount} pending
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            By {authorLabel(item)} · latest report {formatDate(item.latestReportAt)}
          </p>
        </div>
        <ModerationActions item={item} />
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase text-[var(--muted)]">Comment</div>
            <p className="mt-2 whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-sm leading-6">
              {item.body}
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase text-[var(--muted)]">Target</div>
            <div className="mt-2 text-sm">
              {item.target.href ? (
                <Link
                  href={item.target.href}
                  className="font-semibold text-[var(--brand)] hover:underline"
                >
                  {item.target.label}
                </Link>
              ) : (
                <span>{item.target.label}</span>
              )}
              <span className="ml-2 text-xs uppercase text-[var(--muted)]">{item.target.type}</span>
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="text-xs font-semibold uppercase text-[var(--muted)]">Reports</div>
            <div className="mt-2 text-2xl font-bold">{item.reportCount}</div>
            {item.reasons.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.reasons.map((reason) => (
                  <span
                    key={reason}
                    className="rounded-full bg-[var(--card)] px-2 py-1 text-xs text-[var(--muted)]"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-[var(--muted)]">No reason supplied</p>
            )}
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="text-xs font-semibold uppercase text-[var(--muted)]">Recent reports</div>
            <ul className="mt-2 space-y-2">
              {item.reports.map((report) => (
                <li key={report.id} className="text-xs text-[var(--muted)]">
                  <div className="font-medium text-[var(--foreground)]">
                    {report.reporterName ?? report.reporterEmail ?? "Anonymous"}
                  </div>
                  <div>{report.reason ?? "No reason"} · {formatDate(report.createdAt)}</div>
                  {report.reviewedAt ? <div>Reviewed {formatDate(report.reviewedAt)}</div> : null}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </article>
  );
}

function ModerationErrorState() {
  return (
    <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900">
      <h2 className="text-base font-semibold">Moderation queue unavailable</h2>
      <p className="mt-2 text-sm">
        Unable to load reported comments right now. Check server logs before taking moderation
        decisions.
      </p>
    </section>
  );
}

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status = statusFromSearch(rawStatus);
  const result = await getRuntimeAdminCommentModerationItems(status).then(
    (items) => ({ ok: true as const, items }),
    (error) => {
      console.warn("[admin] comment moderation query failed", error);
      return { ok: false as const };
    },
  );
  const items = result.ok ? result.items : [];
  const pendingTotal = items.reduce((sum, item) => sum + item.pendingReportCount, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Comments</h1>
          <p className="text-sm text-[var(--muted)]">
            Review reported comments and hide abusive content.
          </p>
        </div>
        <StatusTabs active={status} />
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="text-sm font-medium text-[var(--muted)]">Reported comments</div>
          <div className="mt-2 text-2xl font-bold">{result.ok ? items.length : "-"}</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="text-sm font-medium text-[var(--muted)]">Pending reports</div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {result.ok ? pendingTotal : "-"}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="text-sm font-medium text-[var(--muted)]">Hidden in view</div>
          <div className="mt-2 text-2xl font-bold">
            {result.ok ? items.filter((item) => item.isHidden).length : "-"}
          </div>
        </div>
      </section>

      {!result.ok ? (
        <ModerationErrorState />
      ) : items.length === 0 ? (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center">
          <h2 className="text-base font-semibold">No comments to review</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            This view has no reported comments right now.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <CommentCard key={item.commentId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
