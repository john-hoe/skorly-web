import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Overview",
  robots: { index: false, follow: false },
};

const FOUNDATION = [
  { label: "Admin gate", value: "Active" },
  { label: "Audit log", value: "Ready" },
  { label: "Jobs guard", value: "Configured by secret" },
];

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-[var(--muted)]">Security foundation</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {FOUNDATION.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <div className="text-sm text-[var(--muted)]">{item.label}</div>
            <div className="mt-2 text-lg font-semibold">{item.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Operations</h2>
            <p className="text-sm text-[var(--muted)]">Manual jobs triggers</p>
          </div>
          <Link
            href="/admin/operations"
            className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
          >
            Open operations
          </Link>
        </div>
      </section>
    </div>
  );
}
