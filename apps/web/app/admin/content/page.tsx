import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  deleteAdminArticle,
  setAdminArticleStatus,
  type AdminArticleManagementResult,
} from "@/lib/admin-actions";
import {
  getRuntimeAdminArticles,
  type RuntimeAdminArticleList,
  type RuntimeAdminArticleListItem,
  type RuntimeAdminArticlePublishedFilter,
  type RuntimeAdminArticleStatus,
  type RuntimeAdminArticleType,
} from "@/lib/runtime-data";
import { PUBLIC_LOCALES, localizedSitePath } from "@/i18n/locales";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Content",
  robots: { index: false, follow: false },
};

const ARTICLE_STATUSES: Array<{ value: RuntimeAdminArticleStatus | "all"; label: string }> = [
  { value: "all", label: "All status" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
];
const ARTICLE_TYPES: RuntimeAdminArticleType[] = [
  "preview",
  "watchpoints",
  "prediction",
  "recap",
  "tactical",
  "group_analysis",
  "news",
];
const ARTICLE_LOCALES = PUBLIC_LOCALES;
const PUBLISHED_FILTERS: Array<{ value: RuntimeAdminArticlePublishedFilter; label: string }> = [
  { value: "all", label: "All dates" },
  { value: "set", label: "Has publishedAt" },
  { value: "missing", label: "Missing publishedAt" },
];

type SearchParams = {
  q?: string;
  status?: string;
  type?: string;
  locale?: string;
  published?: string;
  page?: string;
  notice?: string;
  error?: string;
};

type AdminArticleManagementError = Extract<AdminArticleManagementResult, { ok: false }>["error"];

function normalizeStatus(value: string | undefined): RuntimeAdminArticleStatus | "all" {
  if (value === "draft" || value === "published") return value;
  return "all";
}

function normalizeType(value: string | undefined): RuntimeAdminArticleType | "all" {
  return ARTICLE_TYPES.some((type) => type === value) ? (value as RuntimeAdminArticleType) : "all";
}

function normalizeLocale(value: string | undefined): string {
  return value && ARTICLE_LOCALES.some((locale) => locale === value) ? value : "all";
}

function normalizePublished(value: string | undefined): RuntimeAdminArticlePublishedFilter {
  return value === "set" || value === "missing" ? value : "all";
}

function normalizePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function contentHref(input: {
  q?: string;
  status?: RuntimeAdminArticleStatus | "all";
  type?: RuntimeAdminArticleType | "all";
  locale?: string;
  published?: RuntimeAdminArticlePublishedFilter;
  page?: number;
  notice?: string;
  error?: string;
}) {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  if (input.status && input.status !== "all") params.set("status", input.status);
  if (input.type && input.type !== "all") params.set("type", input.type);
  if (input.locale && input.locale !== "all") params.set("locale", input.locale);
  if (input.published && input.published !== "all") params.set("published", input.published);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  if (input.notice) params.set("notice", input.notice);
  if (input.error) params.set("error", input.error);
  const query = params.toString();
  return query ? `/admin/content?${query}` : "/admin/content";
}

function resultParams(result: AdminArticleManagementResult): { notice?: string; error?: string } {
  if (result.ok) {
    const notices: Record<Extract<AdminArticleManagementResult, { ok: true }>["action"], string> = {
      status: "Article status updated",
      update: "Article saved",
      delete: "Article deleted",
    };
    return { notice: notices[result.action] };
  }
  const messages: Record<AdminArticleManagementError, string> = {
    invalid: "Invalid article change",
    audit: "Audit log write failed",
    upstream: "Database update failed",
    notFound: "Article not found",
    confirmDelete: "Type DELETE to confirm deletion",
    publishedDelete: "Unpublish the article before deleting it",
  };
  return { error: messages[result.error] ?? "Article change failed" };
}

function returnPathFromForm(formData: FormData): string {
  const value = String(formData.get("returnTo") ?? "");
  try {
    const url = new URL(value, "https://skorly.local");
    if (url.origin !== "https://skorly.local" || url.pathname !== "/admin/content") {
      return "/admin/content";
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return "/admin/content";
  }
}

function redirectWithResult(returnTo: string, result: AdminArticleManagementResult): never {
  const url = new URL(returnTo, "https://skorly.local");
  const params = resultParams(result);
  url.searchParams.delete("notice");
  url.searchParams.delete("error");
  if (params.notice) url.searchParams.set("notice", params.notice);
  if (params.error) url.searchParams.set("error", params.error);
  redirect(`${url.pathname}${url.search}`);
}

async function setStatusAction(formData: FormData): Promise<void> {
  "use server";
  const returnTo = returnPathFromForm(formData);
  const result = await setAdminArticleStatus(
    Number(formData.get("articleId")),
    String(formData.get("status") ?? ""),
  );
  redirectWithResult(returnTo, result);
}

async function deleteArticleAction(formData: FormData): Promise<void> {
  "use server";
  const returnTo = returnPathFromForm(formData);
  const result = await deleteAdminArticle(Number(formData.get("articleId")), {
    confirmDelete: String(formData.get("deleteConfirm") ?? "") === "DELETE",
  });
  redirectWithResult(returnTo, result);
}

function formatDate(value: Date | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function articleHref(article: RuntimeAdminArticleListItem): string {
  return localizedSitePath(article.locale, "article", { slug: article.slug });
}

function statusClass(status: RuntimeAdminArticleStatus): string {
  return status === "published"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-amber-100 text-amber-700";
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

function ContentFilters({
  q,
  status,
  type,
  locale,
  published,
}: {
  q: string;
  status: RuntimeAdminArticleStatus | "all";
  type: RuntimeAdminArticleType | "all";
  locale: string;
  published: RuntimeAdminArticlePublishedFilter;
}) {
  return (
    <form
      action="/admin/content"
      className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 xl:grid-cols-[minmax(0,1fr)_10rem_11rem_8rem_12rem_auto]"
    >
      <input
        name="q"
        defaultValue={q}
        placeholder="Search title or slug"
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--brand)]"
      />
      <select
        name="status"
        defaultValue={status}
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
      >
        {ARTICLE_STATUSES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <select
        name="type"
        defaultValue={type}
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
      >
        <option value="all">All types</option>
        {ARTICLE_TYPES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <select
        name="locale"
        defaultValue={locale}
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
      >
        <option value="all">All</option>
        {ARTICLE_LOCALES.map((item) => (
          <option key={item} value={item}>
            {item.toUpperCase()}
          </option>
        ))}
      </select>
      <select
        name="published"
        defaultValue={published}
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
      >
        {PUBLISHED_FILTERS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
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

function StatusForm({ article, returnTo }: { article: RuntimeAdminArticleListItem; returnTo: string }) {
  const nextStatus: RuntimeAdminArticleStatus = article.status === "published" ? "draft" : "published";
  return (
    <form action={setStatusAction}>
      <input type="hidden" name="articleId" value={article.id} />
      <input type="hidden" name="status" value={nextStatus} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        className={
          nextStatus === "published"
            ? "rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
            : "rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--background)]"
        }
      >
        {nextStatus === "published" ? "Publish" : "Unpublish"}
      </button>
    </form>
  );
}

function DeleteForm({ article, returnTo }: { article: RuntimeAdminArticleListItem; returnTo: string }) {
  if (article.status === "published") {
    return <p className="text-xs font-medium text-[var(--muted)]">Unpublish before delete</p>;
  }
  return (
    <form action={deleteArticleAction} className="grid gap-2">
      <input type="hidden" name="articleId" value={article.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input
        name="deleteConfirm"
        placeholder="DELETE"
        className="min-h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs"
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

function ContentTable({ data, returnTo }: { data: RuntimeAdminArticleList; returnTo: string }) {
  if (data.articles.length === 0) {
    return (
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <h2 className="text-base font-semibold">No articles found</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Adjust the search or filters.</p>
      </section>
    );
  }

  return (
    <section className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]">
          <tr>
            <th className="px-4 py-3 font-semibold">Article</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Locale</th>
            <th className="px-4 py-3 font-semibold">Published</th>
            <th className="px-4 py-3 font-semibold">Updated</th>
            <th className="px-4 py-3 font-semibold">Manage</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {data.articles.map((article) => (
            <tr key={article.id}>
              <td className="min-w-96 px-4 py-4 align-top">
                <Link
                  href={`/admin/content/${article.id}`}
                  className="font-semibold text-[var(--foreground)] hover:text-[var(--brand)]"
                >
                  {article.title}
                </Link>
                <div className="mt-1 font-mono text-xs text-[var(--muted)]">
                  #{article.id} · {article.slug}
                </div>
                <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{article.bodyExcerpt || "-"}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                  <span>{article.type}</span>
                  {article.fixtureId ? <span>fixture #{article.fixtureId}</span> : null}
                  {article.groupName ? <span>{article.groupName}</span> : null}
                </div>
              </td>
              <td className="px-4 py-4 align-top">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(article.status)}`}>
                  {article.status}
                </span>
                {article.status === "published" && !article.publishedAt ? (
                  <div className="mt-2 text-xs font-semibold text-red-600">missing publishedAt</div>
                ) : null}
              </td>
              <td className="px-4 py-4 align-top">
                <span className="font-semibold uppercase">{article.locale}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-4 align-top text-[var(--muted)]">
                {formatDate(article.publishedAt)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 align-top text-[var(--muted)]">
                {formatDate(article.updatedAt)}
              </td>
              <td className="min-w-64 px-4 py-4 align-top">
                <div className="grid gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/content/${article.id}`}
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--background)]"
                    >
                      Edit
                    </Link>
                    <Link
                      href={articleHref(article)}
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--background)]"
                    >
                      View
                    </Link>
                    <StatusForm article={article} returnTo={returnTo} />
                  </div>
                  <DeleteForm article={article} returnTo={returnTo} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Pagination({ data }: { data: RuntimeAdminArticleList }) {
  if (data.totalPages <= 1) return null;
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="text-[var(--muted)]">
        Page {data.page} of {data.totalPages}
      </div>
      <div className="flex gap-2">
        {data.page > 1 ? (
          <Link
            href={contentHref({
              q: data.query,
              status: data.status,
              type: data.type,
              locale: data.locale,
              published: data.published,
              page: data.page - 1,
            })}
            className="rounded-lg border border-[var(--border)] px-3 py-2 font-semibold hover:bg-[var(--card)]"
          >
            Previous
          </Link>
        ) : null}
        {data.page < data.totalPages ? (
          <Link
            href={contentHref({
              q: data.query,
              status: data.status,
              type: data.type,
              locale: data.locale,
              published: data.published,
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

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 120);
  const status = normalizeStatus(params.status);
  const type = normalizeType(params.type);
  const locale = normalizeLocale(params.locale);
  const published = normalizePublished(params.published);
  const page = normalizePage(params.page);
  const returnTo = contentHref({ q, status, type, locale, published, page });
  const data = await getRuntimeAdminArticles({ query: q, status, type, locale, published, page }).catch(
    (error) => {
      console.warn("[admin] articles query failed", error);
      return null;
    },
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Content</h1>
          <p className="text-sm text-[var(--muted)]">
            Search articles, manage publication status, and edit content fields.
          </p>
        </div>
        {data ? (
          <div className="text-sm text-[var(--muted)]">
            <span className="font-semibold text-[var(--foreground)]">{data.total}</span> matching articles
          </div>
        ) : null}
      </header>

      <Notice notice={params.notice} error={params.error} />
      <ContentFilters q={q} status={status} type={type} locale={locale} published={published} />

      {data ? (
        <>
          <ContentTable data={data} returnTo={returnTo} />
          <Pagination data={data} />
        </>
      ) : (
        <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900">
          <h2 className="text-base font-semibold">Content unavailable</h2>
          <p className="mt-2 text-sm">Unable to load articles right now.</p>
        </section>
      )}
    </div>
  );
}
