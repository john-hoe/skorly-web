import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  resendAdminSubscriberConfirmation,
  setAdminSubscriberUnsubscribed,
  type AdminSubscriberManagementResult,
} from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/admin";
import {
  getRuntimeAdminSubscribers,
  type RuntimeAdminSubscriberChannel,
  type RuntimeAdminSubscriberConfirmation,
  type RuntimeAdminSubscriberList,
  type RuntimeAdminSubscriberListItem,
  type RuntimeAdminSubscriberStatus,
} from "@/lib/runtime-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Subscribers",
  robots: { index: false, follow: false },
};

const SUBSCRIBER_STATUSES: Array<{ value: RuntimeAdminSubscriberStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "unsubscribed", label: "Unsubscribed" },
  { value: "all", label: "All status" },
];
const CONFIRMATION_FILTERS: Array<{ value: RuntimeAdminSubscriberConfirmation; label: string }> = [
  { value: "all", label: "All confirmation" },
  { value: "confirmed", label: "Confirmed" },
  { value: "unconfirmed", label: "Unconfirmed" },
];
const CHANNEL_FILTERS: Array<{ value: RuntimeAdminSubscriberChannel; label: string }> = [
  { value: "all", label: "All channels" },
  { value: "email", label: "Email only" },
  { value: "whatsapp", label: "Has WhatsApp" },
];
const SUBSCRIBER_LOCALES = ["id", "vi", "en", "zh"] as const;

type SearchParams = {
  q?: string;
  status?: string;
  confirmation?: string;
  channel?: string;
  locale?: string;
  page?: string;
  notice?: string;
  error?: string;
};

type AdminSubscriberManagementError = Extract<AdminSubscriberManagementResult, { ok: false }>["error"];

function normalizeStatus(value: string | undefined): RuntimeAdminSubscriberStatus {
  if (value === "unsubscribed" || value === "all") return value;
  return "active";
}

function normalizeConfirmation(value: string | undefined): RuntimeAdminSubscriberConfirmation {
  return value === "confirmed" || value === "unconfirmed" ? value : "all";
}

function normalizeChannel(value: string | undefined): RuntimeAdminSubscriberChannel {
  return value === "email" || value === "whatsapp" ? value : "all";
}

function normalizeLocale(value: string | undefined): string {
  return value && SUBSCRIBER_LOCALES.some((locale) => locale === value) ? value : "all";
}

function normalizePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function subscribersHref(input: {
  q?: string;
  status?: RuntimeAdminSubscriberStatus;
  confirmation?: RuntimeAdminSubscriberConfirmation;
  channel?: RuntimeAdminSubscriberChannel;
  locale?: string;
  page?: number;
  notice?: string;
  error?: string;
}) {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  if (input.status && input.status !== "active") params.set("status", input.status);
  if (input.confirmation && input.confirmation !== "all") {
    params.set("confirmation", input.confirmation);
  }
  if (input.channel && input.channel !== "all") params.set("channel", input.channel);
  if (input.locale && input.locale !== "all") params.set("locale", input.locale);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  if (input.notice) params.set("notice", input.notice);
  if (input.error) params.set("error", input.error);
  const query = params.toString();
  return query ? `/admin/subscribers?${query}` : "/admin/subscribers";
}

function exportHref(data: RuntimeAdminSubscriberList): string {
  const params = new URLSearchParams();
  if (data.query) params.set("q", data.query);
  if (data.status !== "active") params.set("status", data.status);
  if (data.confirmation !== "all") params.set("confirmation", data.confirmation);
  if (data.channel !== "all") params.set("channel", data.channel);
  if (data.locale !== "all") params.set("locale", data.locale);
  const query = params.toString();
  return query ? `/admin/subscribers/export?${query}` : "/admin/subscribers/export";
}

function resultParams(result: AdminSubscriberManagementResult): { notice?: string; error?: string } {
  if (result.ok) {
    const notices: Record<Extract<AdminSubscriberManagementResult, { ok: true }>["action"], string> = {
      unsubscribe: "Subscriber unsubscribed",
      restore: "Subscriber restored",
      resendConfirm: "Confirmation email sent",
    };
    return { notice: notices[result.action] };
  }
  const messages: Record<AdminSubscriberManagementError, string> = {
    invalid: "Invalid subscriber change",
    audit: "Audit log write failed",
    upstream: "Database update failed",
    notFound: "Subscriber not found",
    confirmRestore: "Type RESTORE to restore marketing consent",
    alreadyConfirmed: "Subscriber is already confirmed",
    unsubscribed: "Restore the subscriber before sending confirmation",
    email: "Email provider rejected the confirmation email",
  };
  return { error: messages[result.error] ?? "Subscriber change failed" };
}

function returnPathFromForm(formData: FormData): string {
  const value = String(formData.get("returnTo") ?? "");
  try {
    const url = new URL(value, "https://skorly.local");
    if (url.origin !== "https://skorly.local" || url.pathname !== "/admin/subscribers") {
      return "/admin/subscribers";
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return "/admin/subscribers";
  }
}

function redirectWithResult(returnTo: string, result: AdminSubscriberManagementResult): never {
  const url = new URL(returnTo, "https://skorly.local");
  const params = resultParams(result);
  url.searchParams.delete("notice");
  url.searchParams.delete("error");
  if (params.notice) url.searchParams.set("notice", params.notice);
  if (params.error) url.searchParams.set("error", params.error);
  redirect(`${url.pathname}${url.search}`);
}

async function setUnsubscribedAction(formData: FormData): Promise<void> {
  "use server";
  const returnTo = returnPathFromForm(formData);
  const result = await setAdminSubscriberUnsubscribed(
    Number(formData.get("subscriberId")),
    String(formData.get("unsubscribed") ?? "") === "true",
    { confirmRestore: String(formData.get("restoreConfirm") ?? "") === "RESTORE" },
  );
  redirectWithResult(returnTo, result);
}

async function resendConfirmationAction(formData: FormData): Promise<void> {
  "use server";
  const returnTo = returnPathFromForm(formData);
  const result = await resendAdminSubscriberConfirmation(Number(formData.get("subscriberId")));
  redirectWithResult(returnTo, result);
}

function formatDate(value: Date | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function truncate(value: string | null, length = 90): string {
  if (!value) return "-";
  return value.length <= length ? value : `${value.slice(0, length - 1)}...`;
}

function statusClass(kind: "active" | "unsubscribed" | "confirmed" | "unconfirmed" | "whatsapp") {
  const classes = {
    active: "bg-emerald-100 text-emerald-700",
    unsubscribed: "bg-red-100 text-red-700",
    confirmed: "bg-blue-100 text-blue-700",
    unconfirmed: "bg-amber-100 text-amber-700",
    whatsapp: "bg-teal-100 text-teal-700",
  };
  return classes[kind];
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

function SubscribersFilters({
  q,
  status,
  confirmation,
  channel,
  locale,
}: {
  q: string;
  status: RuntimeAdminSubscriberStatus;
  confirmation: RuntimeAdminSubscriberConfirmation;
  channel: RuntimeAdminSubscriberChannel;
  locale: string;
}) {
  return (
    <form action="/admin/subscribers" className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 xl:grid-cols-[minmax(0,1fr)_11rem_12rem_11rem_9rem_auto]">
      <input
        name="q"
        defaultValue={q}
        placeholder="Search email, WhatsApp, source, country"
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--brand)]"
      />
      <select
        name="status"
        defaultValue={status}
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
      >
        {SUBSCRIBER_STATUSES.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
      <select
        name="confirmation"
        defaultValue={confirmation}
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
      >
        {CONFIRMATION_FILTERS.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
      <select
        name="channel"
        defaultValue={channel}
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
      >
        {CHANNEL_FILTERS.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
      <select
        name="locale"
        defaultValue={locale}
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
      >
        <option value="all">All locales</option>
        {SUBSCRIBER_LOCALES.map((item) => (
          <option key={item} value={item}>{item.toUpperCase()}</option>
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

function ResendForm({ subscriber, returnTo }: { subscriber: RuntimeAdminSubscriberListItem; returnTo: string }) {
  const disabled = !!subscriber.confirmedAt || !!subscriber.unsubscribedAt || !subscriber.consentMarketing;
  return (
    <form action={resendConfirmationAction}>
      <input type="hidden" name="subscriberId" value={subscriber.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        disabled={disabled}
        className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--background)] disabled:cursor-not-allowed disabled:opacity-45"
      >
        Resend confirm
      </button>
    </form>
  );
}

function SubscriptionStatusForm({
  subscriber,
  returnTo,
}: {
  subscriber: RuntimeAdminSubscriberListItem;
  returnTo: string;
}) {
  const unsubscribe = !subscriber.unsubscribedAt;
  return (
    <form action={setUnsubscribedAction} className="space-y-2">
      <input type="hidden" name="subscriberId" value={subscriber.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="unsubscribed" value={String(unsubscribe)} />
      <button
        type="submit"
        className={
          unsubscribe
            ? "rounded-lg border border-red-500 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-500 hover:text-white"
            : "rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--background)]"
        }
      >
        {unsubscribe ? "Unsubscribe" : "Restore"}
      </button>
      {!unsubscribe ? (
        <input
          name="restoreConfirm"
          placeholder="Type RESTORE"
          className="min-h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs"
        />
      ) : null}
    </form>
  );
}

function SubscribersTable({ data, returnTo }: { data: RuntimeAdminSubscriberList; returnTo: string }) {
  if (data.subscribers.length === 0) {
    return (
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <h2 className="text-base font-semibold">No subscribers found</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Adjust the search or filters.</p>
      </section>
    );
  }

  return (
    <section className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]">
          <tr>
            <th className="px-4 py-3 font-semibold">Subscriber</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Locale</th>
            <th className="px-4 py-3 font-semibold">Source</th>
            <th className="px-4 py-3 font-semibold">Activity</th>
            <th className="px-4 py-3 font-semibold">Created</th>
            <th className="px-4 py-3 font-semibold">Manage</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {data.subscribers.map((subscriber) => {
            const active = !subscriber.unsubscribedAt;
            const confirmed = !!subscriber.confirmedAt;
            return (
              <tr key={subscriber.id} className={active ? undefined : "bg-red-50/40"}>
                <td className="min-w-72 px-4 py-4 align-top">
                  <div className="font-semibold">{subscriber.email}</div>
                  <div className="mt-1 text-[var(--muted)]">{subscriber.whatsappNumber ?? "No WhatsApp"}</div>
                  <div className="mt-1 font-mono text-xs text-[var(--muted)]">#{subscriber.id}</div>
                </td>
                <td className="min-w-52 px-4 py-4 align-top">
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(active ? "active" : "unsubscribed")}`}>
                      {active ? "active" : "unsubscribed"}
                    </span>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(confirmed ? "confirmed" : "unconfirmed")}`}>
                      {confirmed ? "confirmed" : "unconfirmed"}
                    </span>
                    {subscriber.whatsappNumber ? (
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass("whatsapp")}`}>
                        WhatsApp
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 text-xs text-[var(--muted)]">
                    <div>Consent {formatDate(subscriber.consentAt)}</div>
                    <div>Confirmed {formatDate(subscriber.confirmedAt)}</div>
                    <div>Unsubscribed {formatDate(subscriber.unsubscribedAt)}</div>
                  </div>
                </td>
                <td className="px-4 py-4 align-top">
                  <span className="font-semibold uppercase">{subscriber.locale}</span>
                </td>
                <td className="min-w-44 px-4 py-4 align-top text-[var(--muted)]">
                  <div>{subscriber.source ?? "-"}</div>
                  <div className="mt-1 text-xs">Country {subscriber.country ?? "-"}</div>
                </td>
                <td className="min-w-60 px-4 py-4 align-top text-[var(--muted)]">
                  <div>{subscriber.giftSent ? `Gift sent ${formatDate(subscriber.giftSentAt)}` : "Gift not sent"}</div>
                  <div className="mt-1 text-xs">{truncate(subscriber.userAgent)}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-4 align-top text-[var(--muted)]">
                  {formatDate(subscriber.createdAt)}
                </td>
                <td className="min-w-56 px-4 py-4 align-top">
                  <div className="grid gap-3">
                    <ResendForm subscriber={subscriber} returnTo={returnTo} />
                    <SubscriptionStatusForm subscriber={subscriber} returnTo={returnTo} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function Pagination({ data }: { data: RuntimeAdminSubscriberList }) {
  if (data.totalPages <= 1) return null;
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="text-[var(--muted)]">
        Page {data.page} of {data.totalPages}
      </div>
      <div className="flex gap-2">
        {data.page > 1 ? (
          <Link
            href={subscribersHref({
              q: data.query,
              status: data.status,
              confirmation: data.confirmation,
              channel: data.channel,
              locale: data.locale,
              page: data.page - 1,
            })}
            className="rounded-lg border border-[var(--border)] px-3 py-2 font-semibold hover:bg-[var(--card)]"
          >
            Previous
          </Link>
        ) : null}
        {data.page < data.totalPages ? (
          <Link
            href={subscribersHref({
              q: data.query,
              status: data.status,
              confirmation: data.confirmation,
              channel: data.channel,
              locale: data.locale,
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

export default async function AdminSubscribersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  await requireAdmin();
  const q = (params.q ?? "").trim().slice(0, 120);
  const status = normalizeStatus(params.status);
  const confirmation = normalizeConfirmation(params.confirmation);
  const channel = normalizeChannel(params.channel);
  const locale = normalizeLocale(params.locale);
  const page = normalizePage(params.page);
  const returnTo = subscribersHref({ q, status, confirmation, channel, locale, page });
  const data = await getRuntimeAdminSubscribers({ query: q, status, confirmation, channel, locale, page }).catch(
    (error) => {
      console.warn("[admin] subscribers query failed", error);
      return null;
    },
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Subscribers</h1>
          <p className="text-sm text-[var(--muted)]">
            Review email and WhatsApp subscribers, confirmation status, consent, and suppression state.
          </p>
        </div>
        {data ? (
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
            <span><span className="font-semibold text-[var(--foreground)]">{data.total}</span> matching subscribers</span>
            <a
              href={exportHref(data)}
              className="rounded-lg border border-[var(--border)] px-3 py-2 font-semibold text-[var(--foreground)] hover:bg-[var(--card)]"
            >
              Export CSV
            </a>
          </div>
        ) : null}
      </header>

      <Notice notice={params.notice} error={params.error} />
      <SubscribersFilters q={q} status={status} confirmation={confirmation} channel={channel} locale={locale} />

      {data ? (
        <>
          <SubscribersTable data={data} returnTo={returnTo} />
          <Pagination data={data} />
        </>
      ) : (
        <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900">
          <h2 className="text-base font-semibold">Subscribers unavailable</h2>
          <p className="mt-2 text-sm">Unable to load subscriber records right now.</p>
        </section>
      )}
    </div>
  );
}
