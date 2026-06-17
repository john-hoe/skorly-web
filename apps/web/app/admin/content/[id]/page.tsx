import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  deleteAdminArticle,
  updateAdminArticle,
  type AdminArticleManagementResult,
} from "@/lib/admin-actions";
import { getRuntimeAdminArticle, type RuntimeAdminArticleDetail } from "@/lib/runtime-data";
import { localizedSitePath } from "@/i18n/locales";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit Content",
  robots: { index: false, follow: false },
};

type SearchParams = {
  notice?: string;
  error?: string;
};

type AdminArticleManagementError = Extract<AdminArticleManagementResult, { ok: false }>["error"];

function articleAdminHref(articleId: number, input: { notice?: string; error?: string } = {}) {
  const params = new URLSearchParams();
  if (input.notice) params.set("notice", input.notice);
  if (input.error) params.set("error", input.error);
  const query = params.toString();
  const path = Number.isInteger(articleId) && articleId > 0 ? `/admin/content/${articleId}` : "/admin/content";
  return query ? `${path}?${query}` : path;
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

function returnPathFromForm(formData: FormData, fallbackArticleId: number): string {
  const value = String(formData.get("returnTo") ?? "");
  const fallback = articleAdminHref(fallbackArticleId);
  if (!Number.isInteger(fallbackArticleId) || fallbackArticleId <= 0) return fallback;
  try {
    const url = new URL(value, "https://skorly.local");
    if (
      url.origin !== "https://skorly.local" ||
      url.pathname !== `/admin/content/${fallbackArticleId}`
    ) {
      return fallback;
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
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

async function updateArticleAction(formData: FormData): Promise<void> {
  "use server";
  const articleId = Number(formData.get("articleId"));
  const returnTo = returnPathFromForm(formData, articleId);
  const result = await updateAdminArticle(articleId, {
    title: String(formData.get("title") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    body: String(formData.get("body") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    status: String(formData.get("status") ?? ""),
    publishedAt: String(formData.get("publishedAt") ?? ""),
  });
  redirectWithResult(returnTo, result);
}

async function deleteArticleAction(formData: FormData): Promise<void> {
  "use server";
  const articleId = Number(formData.get("articleId"));
  const result = await deleteAdminArticle(articleId, {
    confirmDelete: String(formData.get("deleteConfirm") ?? "") === "DELETE",
  });
  const params = resultParams(result);
  if (result.ok) {
    const url = new URL("/admin/content", "https://skorly.local");
    if (params.notice) url.searchParams.set("notice", params.notice);
    redirect(`${url.pathname}${url.search}`);
  }
  redirectWithResult(returnPathFromForm(formData, articleId), result);
}

function formatDate(value: Date | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function articleHref(article: RuntimeAdminArticleDetail): string {
  return localizedSitePath(article.locale, "article", { slug: article.slug });
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

function ArticleEditForm({ article, returnTo }: { article: RuntimeAdminArticleDetail; returnTo: string }) {
  return (
    <form action={updateArticleAction} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <input type="hidden" name="articleId" value={article.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="grid gap-4">
        <Field label="Title">
          <input
            name="title"
            defaultValue={article.title}
            required
            maxLength={240}
            className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--brand)]"
          />
        </Field>
        <Field label="Summary">
          <textarea
            name="summary"
            defaultValue={article.summary ?? ""}
            maxLength={600}
            rows={3}
            className="min-h-24 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
          />
        </Field>
        <Field label="Body">
          <textarea
            name="body"
            defaultValue={article.body}
            required
            maxLength={120000}
            rows={22}
            className="min-h-[28rem] rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-[var(--brand)]"
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Image URL">
            <input
              type="url"
              name="imageUrl"
              defaultValue={article.imageUrl ?? ""}
              maxLength={2000}
              className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--brand)]"
            />
          </Field>
          <Field label="PublishedAt ISO">
            <input
              name="publishedAt"
              defaultValue={article.publishedAt?.toISOString() ?? ""}
              placeholder="2026-06-09T12:00:00.000Z"
              className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--brand)]"
            />
          </Field>
        </div>
        <Field label="Status">
          <select
            name="status"
            defaultValue={article.status}
            className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </Field>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
        >
          Save article
        </button>
        <Link
          href="/admin/content"
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--background)]"
        >
          Back
        </Link>
        <Link
          href={articleHref(article)}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--background)]"
        >
          View public
        </Link>
      </div>
    </form>
  );
}

function ArticleMeta({ article, returnTo }: { article: RuntimeAdminArticleDetail; returnTo: string }) {
  return (
    <aside className="space-y-4">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="text-base font-semibold">Metadata</h2>
        <dl className="mt-4 grid gap-3 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase text-[var(--muted)]">ID</dt>
            <dd className="mt-1 font-mono">{article.id}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-[var(--muted)]">Slug</dt>
            <dd className="mt-1 break-all font-mono">{article.slug}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-[var(--muted)]">Locale / Type</dt>
            <dd className="mt-1">
              {article.locale.toUpperCase()} / {article.type}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-[var(--muted)]">Fixture</dt>
            <dd className="mt-1">{article.fixtureId ? `#${article.fixtureId}` : "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-[var(--muted)]">Team / Group</dt>
            <dd className="mt-1">
              {article.teamId ? `team #${article.teamId}` : "-"} / {article.groupName ?? "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-[var(--muted)]">Quality / Model</dt>
            <dd className="mt-1">
              {article.qualityScore ?? "-"} / {article.model ?? "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-[var(--muted)]">Created</dt>
            <dd className="mt-1">{formatDate(article.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-[var(--muted)]">Updated</dt>
            <dd className="mt-1">{formatDate(article.updatedAt)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
        <h2 className="text-base font-semibold">Delete</h2>
        {article.status === "published" ? (
          <p className="mt-2 text-sm">Unpublish the article before deleting it.</p>
        ) : (
          <form action={deleteArticleAction} className="mt-3 grid gap-2">
            <input type="hidden" name="articleId" value={article.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input
              name="deleteConfirm"
              placeholder="DELETE"
              className="min-h-10 rounded-lg border border-red-200 bg-white px-3 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg border border-red-600 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-600 hover:text-white"
            >
              Delete article
            </button>
          </form>
        )}
      </section>
    </aside>
  );
}

export default async function AdminContentEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const articleId = Number(id);
  if (!Number.isInteger(articleId) || articleId <= 0) notFound();

  let article: RuntimeAdminArticleDetail | null = null;
  let unavailable = false;
  try {
    article = await getRuntimeAdminArticle(articleId);
  } catch (error) {
    console.warn("[admin] article detail query failed", error);
    unavailable = true;
  }
  if (!article && !unavailable) notFound();
  const returnTo = articleAdminHref(articleId);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <Link href="/admin/content" className="text-sm font-semibold text-[var(--brand)] hover:underline">
            Content
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{article?.title ?? "Edit article"}</h1>
          {article ? (
            <p className="text-sm text-[var(--muted)]">
              {article.status} · {article.locale.toUpperCase()} · {article.slug}
            </p>
          ) : null}
        </div>
      </header>

      <Notice notice={query.notice} error={query.error} />

      {article ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <ArticleEditForm article={article} returnTo={returnTo} />
          <ArticleMeta article={article} returnTo={returnTo} />
        </div>
      ) : (
        <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900">
          <h2 className="text-base font-semibold">Article unavailable</h2>
          <p className="mt-2 text-sm">Unable to load this article right now.</p>
        </section>
      )}
    </div>
  );
}
