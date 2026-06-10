import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  deleteAdminMediaItem,
  retryAdminMediaItem,
  runAdminOperation,
  setAdminMediaUrl,
  type AdminMediaManagementResult,
  type RunAdminOperationResult,
} from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/admin";
import {
  getRuntimeAdminMedia,
  getRuntimeAdminMediaKinds,
  type RuntimeAdminMediaItem,
  type RuntimeAdminMediaList,
  type RuntimeAdminMediaStatusFilter,
} from "@/lib/runtime-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Media",
  robots: { index: false, follow: false },
};

const MEDIA_STATUSES: Array<{ value: RuntimeAdminMediaStatusFilter; label: string }> = [
  { value: "all", label: "All status" },
  { value: "pending", label: "Pending" },
  { value: "ready", label: "Ready" },
  { value: "failed", label: "Failed" },
];

type SearchParams = {
  q?: string;
  status?: string;
  kind?: string;
  fixtureId?: string;
  page?: string;
  notice?: string;
  error?: string;
};

type AdminMediaManagementError = Extract<AdminMediaManagementResult, { ok: false }>["error"];

function normalizeStatus(value: string | undefined): RuntimeAdminMediaStatusFilter {
  return value === "pending" || value === "ready" || value === "failed" ? value : "all";
}

function normalizeKind(value: string | undefined): string {
  const next = (value ?? "")
    .trim()
    .replace(/[%*(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return next || "all";
}

function normalizeFixtureId(value: string | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function mediaHref(input: {
  q?: string;
  status?: RuntimeAdminMediaStatusFilter;
  kind?: string;
  fixtureId?: number | null;
  page?: number;
  notice?: string;
  error?: string;
}) {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  if (input.status && input.status !== "all") params.set("status", input.status);
  if (input.kind && input.kind !== "all") params.set("kind", input.kind);
  if (input.fixtureId) params.set("fixtureId", String(input.fixtureId));
  if (input.page && input.page > 1) params.set("page", String(input.page));
  if (input.notice) params.set("notice", input.notice);
  if (input.error) params.set("error", input.error);
  const query = params.toString();
  return query ? `/admin/media?${query}` : "/admin/media";
}

function managementResultParams(result: AdminMediaManagementResult): { notice?: string; error?: string } {
  if (result.ok) {
    const notices: Record<Extract<AdminMediaManagementResult, { ok: true }>["action"], string> = {
      url: "Media URL saved",
      retry: "Media item returned to pending queue",
      delete: "Media item deleted",
    };
    return { notice: notices[result.action] };
  }
  const messages: Record<AdminMediaManagementError, string> = {
    invalid: "Invalid media change",
    invalidUrl: "Enter a valid http or https URL",
    audit: "Audit log write failed",
    upstream: "Database update failed",
    notFound: "Media item not found",
    confirmRetry: "Type RETRY to clear URL and queue this image again",
    confirmDelete: "Type DELETE to remove this media row",
    missingPrompt: "This media row has no prompt to retry",
  };
  return { error: messages[result.error] ?? "Media change failed" };
}

function operationResultParams(result: RunAdminOperationResult): { notice?: string; error?: string } {
  if (result.ok) return { notice: `Poster job completed (${result.status})` };
  if (result.error === "notConfigured") return { error: "Missing JOBS_ADMIN_URL or JOBS_ADMIN_SECRET" };
  if (result.error === "audit") return { error: "Audit log write failed" };
  if (result.error === "invalid") return { error: "Invalid operation" };
  return { error: result.status ? `Poster job failed with ${result.status}` : "Poster job failed" };
}

function returnPathFromForm(formData: FormData): string {
  const value = String(formData.get("returnTo") ?? "");
  try {
    const url = new URL(value, "https://skorly.local");
    if (url.origin !== "https://skorly.local" || url.pathname !== "/admin/media") {
      return "/admin/media";
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return "/admin/media";
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

async function saveUrlAction(formData: FormData): Promise<void> {
  "use server";
  const returnTo = returnPathFromForm(formData);
  const result = await setAdminMediaUrl(
    Number(formData.get("imageId")),
    String(formData.get("imageUrl") ?? ""),
  );
  redirectWithParams(returnTo, managementResultParams(result));
}

async function retryMediaAction(formData: FormData): Promise<void> {
  "use server";
  const returnTo = returnPathFromForm(formData);
  const result = await retryAdminMediaItem(Number(formData.get("imageId")), {
    confirmRetry: String(formData.get("retryConfirm") ?? "") === "RETRY",
  });
  redirectWithParams(returnTo, managementResultParams(result));
}

async function deleteMediaAction(formData: FormData): Promise<void> {
  "use server";
  const returnTo = returnPathFromForm(formData);
  const result = await deleteAdminMediaItem(Number(formData.get("imageId")), {
    confirmDelete: String(formData.get("deleteConfirm") ?? "") === "DELETE",
  });
  redirectWithParams(returnTo, managementResultParams(result));
}

async function runPostersAction(formData: FormData): Promise<void> {
  "use server";
  const returnTo = returnPathFromForm(formData);
  const result = await runAdminOperation("posters");
  redirectWithParams(returnTo, operationResultParams(result));
}

function formatDate(value: Date | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function truncate(value: string | null, length = 120): string {
  if (!value) return "-";
  return value.length <= length ? value : `${value.slice(0, length - 1)}...`;
}

function safeImageUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function statusClass(status: string): string {
  if (status === "ready") return "bg-emerald-100 text-emerald-700";
  if (status === "pending") return "bg-amber-100 text-amber-700";
  if (status === "failed") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
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

function MediaFilters({
  q,
  status,
  kind,
  fixtureId,
  kinds,
}: {
  q: string;
  status: RuntimeAdminMediaStatusFilter;
  kind: string;
  fixtureId: number | null;
  kinds: string[];
}) {
  return (
    <form action="/admin/media" className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 xl:grid-cols-[minmax(0,1fr)_11rem_11rem_9rem_auto]">
      <label htmlFor="media-search" className="sr-only">Search media</label>
      <input
        id="media-search"
        name="q"
        defaultValue={q}
        placeholder="Search team, category, kind, variant, URL"
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--brand)]"
      />
      <label htmlFor="media-status" className="sr-only">Media status</label>
      <select
        id="media-status"
        name="status"
        defaultValue={status}
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
      >
        {MEDIA_STATUSES.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
      <label htmlFor="media-kind" className="sr-only">Media kind</label>
      <select
        id="media-kind"
        name="kind"
        defaultValue={kind}
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
      >
        <option value="all">All kinds</option>
        {kinds.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <label htmlFor="media-fixture-id" className="sr-only">Fixture ID</label>
      <input
        id="media-fixture-id"
        name="fixtureId"
        defaultValue={fixtureId ?? ""}
        inputMode="numeric"
        placeholder="Fixture ID"
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--brand)]"
      />
      <button
        type="submit"
        className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
      >
        Search
      </button>
    </form>
  );
}

function PosterJobButton({ returnTo }: { returnTo: string }) {
  return (
    <form action={runPostersAction}>
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
      >
        Run poster queue
      </button>
    </form>
  );
}

function MediaPreview({ image }: { image: RuntimeAdminMediaItem }) {
  const url = safeImageUrl(image.url);
  return (
    <div className="w-40">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            referrerPolicy="no-referrer"
            className="aspect-[4/3] w-40 rounded-lg border border-[var(--border)] bg-[var(--background)] object-cover"
          />
        </a>
      ) : (
        <div className="flex aspect-[4/3] w-40 items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] text-xs text-[var(--muted)]">
          No image
        </div>
      )}
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs font-semibold text-[var(--brand)]">
          Open image
        </a>
      ) : null}
    </div>
  );
}

function SaveUrlForm({ image, returnTo }: { image: RuntimeAdminMediaItem; returnTo: string }) {
  const inputId = `media-url-${image.id}`;
  return (
    <form action={saveUrlAction} className="space-y-2">
      <input type="hidden" name="imageId" value={image.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <label htmlFor={inputId} className="sr-only">Media URL for image {image.id}</label>
      <input
        id={inputId}
        name="imageUrl"
        defaultValue={image.url ?? ""}
        placeholder="https://..."
        autoComplete="off"
        className="min-h-9 w-full min-w-72 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs outline-none focus:border-[var(--brand)]"
      />
      <button
        type="submit"
        className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--background)]"
      >
        Save URL
      </button>
    </form>
  );
}

function RetryForm({ image, returnTo }: { image: RuntimeAdminMediaItem; returnTo: string }) {
  const disabled = !image.prompt;
  const inputId = `media-retry-${image.id}`;
  return (
    <form action={retryMediaAction} className="space-y-2">
      <input type="hidden" name="imageId" value={image.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <label htmlFor={inputId} className="sr-only">Retry confirmation for image {image.id}</label>
      <input
        id={inputId}
        name="retryConfirm"
        placeholder="Type RETRY"
        autoComplete="off"
        disabled={disabled}
        className="min-h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs disabled:cursor-not-allowed disabled:opacity-45"
      />
      <button
        type="submit"
        disabled={disabled}
        className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--background)] disabled:cursor-not-allowed disabled:opacity-45"
      >
        Retry
      </button>
    </form>
  );
}

function DeleteForm({ image, returnTo }: { image: RuntimeAdminMediaItem; returnTo: string }) {
  const inputId = `media-delete-${image.id}`;
  return (
    <form action={deleteMediaAction} className="space-y-2">
      <input type="hidden" name="imageId" value={image.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <label htmlFor={inputId} className="sr-only">Delete confirmation for image {image.id}</label>
      <input
        id={inputId}
        name="deleteConfirm"
        placeholder="Type DELETE"
        autoComplete="off"
        className="min-h-9 w-full rounded-lg border border-red-200 bg-[var(--background)] px-2 text-xs"
      />
      <button
        type="submit"
        className="rounded-lg border border-red-500 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-500 hover:text-white"
      >
        Delete
      </button>
    </form>
  );
}

function MediaTable({ data, returnTo }: { data: RuntimeAdminMediaList; returnTo: string }) {
  if (data.images.length === 0) {
    return (
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <h2 className="text-base font-semibold">No media found</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Adjust the search or filters.</p>
      </section>
    );
  }

  return (
    <section className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]">
          <tr>
            <th className="px-4 py-3 font-semibold">Preview</th>
            <th className="px-4 py-3 font-semibold">Media</th>
            <th className="px-4 py-3 font-semibold">Fixture</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Prompt</th>
            <th className="px-4 py-3 font-semibold">Created</th>
            <th className="px-4 py-3 font-semibold">Manage</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {data.images.map((image) => (
            <tr key={image.id}>
              <td className="px-4 py-4 align-top">
                <MediaPreview image={image} />
              </td>
              <td className="min-w-64 px-4 py-4 align-top">
                <div className="font-semibold">{image.kind}</div>
                <div className="mt-1 text-[var(--muted)]">{image.category}</div>
                <div className="mt-1 font-mono text-xs text-[var(--muted)]">#{image.id}</div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  Variant {image.variant ?? "-"} | Team {image.team ?? "-"}
                </div>
              </td>
              <td className="min-w-72 px-4 py-4 align-top">
                {image.fixture ? (
                  <>
                    <div className="font-semibold">{image.fixture.home.name} vs {image.fixture.away.name}</div>
                    <Link
                      href={`/admin/matches/${image.fixture.id}`}
                      className="mt-1 block font-mono text-xs text-[var(--brand)]"
                    >
                      {image.fixture.slug}
                    </Link>
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      DB {image.fixture.id} | {image.fixture.status} | {formatDate(image.fixture.kickoffAt)}
                    </div>
                  </>
                ) : (
                  <span className="text-[var(--muted)]">
                    {image.fixtureId ? `Missing fixture #${image.fixtureId}` : "Generic image"}
                  </span>
                )}
              </td>
              <td className="px-4 py-4 align-top">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(image.status)}`}>
                  {image.status}
                </span>
                <div className="mt-2 text-xs text-[var(--muted)]">
                  {image.url ? "URL set" : "No URL"}
                </div>
              </td>
              <td className="min-w-80 px-4 py-4 align-top text-xs text-[var(--muted)]">
                <div className="max-w-96 whitespace-pre-wrap break-words">
                  {truncate(image.prompt, 180)}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-4 align-top text-[var(--muted)]">
                {formatDate(image.createdAt)}
              </td>
              <td className="min-w-96 px-4 py-4 align-top">
                <div className="grid gap-3">
                  <SaveUrlForm image={image} returnTo={returnTo} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <RetryForm image={image} returnTo={returnTo} />
                    <DeleteForm image={image} returnTo={returnTo} />
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Pagination({ data }: { data: RuntimeAdminMediaList }) {
  if (data.totalPages <= 1) return null;
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="text-[var(--muted)]">
        Page {data.page} of {data.totalPages}
      </div>
      <div className="flex gap-2">
        {data.page > 1 ? (
          <Link
            href={mediaHref({
              q: data.query,
              status: data.status,
              kind: data.kind,
              fixtureId: data.fixtureId,
              page: data.page - 1,
            })}
            className="rounded-lg border border-[var(--border)] px-3 py-2 font-semibold hover:bg-[var(--card)]"
          >
            Previous
          </Link>
        ) : null}
        {data.page < data.totalPages ? (
          <Link
            href={mediaHref({
              q: data.query,
              status: data.status,
              kind: data.kind,
              fixtureId: data.fixtureId,
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

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  await requireAdmin();
  const q = (params.q ?? "").trim().slice(0, 120);
  const status = normalizeStatus(params.status);
  const kind = normalizeKind(params.kind);
  const fixtureId = normalizeFixtureId(params.fixtureId);
  const page = normalizePage(params.page);
  const returnTo = mediaHref({ q, status, kind, fixtureId, page });

  const [kinds, data] = await Promise.all([
    getRuntimeAdminMediaKinds().catch((error) => {
      console.warn("[admin] media kinds query failed", error);
      return [];
    }),
    getRuntimeAdminMedia({ query: q, status, kind, fixtureId: fixtureId ?? undefined, page }).catch((error) => {
      console.warn("[admin] media query failed", error);
      return null;
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Media</h1>
          <p className="text-sm text-[var(--muted)]">
            Review image library rows, poster prompts, hosted URLs, and generation queue state.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {data ? (
            <div className="text-sm text-[var(--muted)]">
              <span className="font-semibold text-[var(--foreground)]">{data.total}</span> media rows
            </div>
          ) : null}
          <PosterJobButton returnTo={returnTo} />
        </div>
      </header>

      <Notice notice={params.notice} error={params.error} />
      <MediaFilters q={q} status={status} kind={kind} fixtureId={fixtureId} kinds={kinds} />

      {data ? (
        <>
          <MediaTable data={data} returnTo={returnTo} />
          <Pagination data={data} />
        </>
      ) : (
        <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900">
          <h2 className="text-base font-semibold">Media unavailable</h2>
          <p className="mt-2 text-sm">Unable to load media library records right now.</p>
        </section>
      )}
    </div>
  );
}
