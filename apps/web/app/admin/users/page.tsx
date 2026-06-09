import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  setAdminUserDeleted,
  setAdminUserRole,
  type AdminUserManagementResult,
} from "@/lib/admin-actions";
import {
  getRuntimeAdminUsers,
  type RuntimeAdminUserList,
  type RuntimeAdminUserListItem,
  type RuntimeAdminUserRole,
  type RuntimeAdminUserStatus,
} from "@/lib/runtime-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Users",
  robots: { index: false, follow: false },
};

const USER_ROLES: RuntimeAdminUserRole[] = ["member", "premium", "admin"];
const USER_STATUSES: Array<{ value: RuntimeAdminUserStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "deleted", label: "Deactivated" },
  { value: "all", label: "All" },
];

type SearchParams = {
  q?: string;
  status?: string;
  role?: string;
  page?: string;
  notice?: string;
  error?: string;
};

type AdminUserManagementError = Extract<AdminUserManagementResult, { ok: false }>["error"];

function normalizeStatus(value: string | undefined): RuntimeAdminUserStatus {
  if (value === "deleted" || value === "all") return value;
  return "active";
}

function normalizeRole(value: string | undefined): RuntimeAdminUserRole | "all" {
  if (value === "member" || value === "premium" || value === "admin") return value;
  return "all";
}

function normalizePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function usersHref(input: {
  q?: string;
  status?: RuntimeAdminUserStatus;
  role?: RuntimeAdminUserRole | "all";
  page?: number;
  notice?: string;
  error?: string;
}) {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  if (input.status && input.status !== "active") params.set("status", input.status);
  if (input.role && input.role !== "all") params.set("role", input.role);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  if (input.notice) params.set("notice", input.notice);
  if (input.error) params.set("error", input.error);
  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

function resultParams(result: AdminUserManagementResult): { notice?: string; error?: string } {
  if (result.ok) return { notice: `${result.action} updated` };
  const messages: Record<AdminUserManagementError, string> = {
    invalid: "Invalid user change",
    audit: "Audit log write failed",
    upstream: "Database update failed",
    notFound: "User not found",
    confirmAdmin: "Type ADMIN to confirm admin role/status changes",
    selfAdmin: "You cannot remove your own admin access",
    lastAdmin: "At least one active admin must remain",
  };
  return { error: messages[result.error] ?? "User change failed" };
}

function returnPathFromForm(formData: FormData): string {
  const value = String(formData.get("returnTo") ?? "");
  return value.startsWith("/admin/users") ? value : "/admin/users";
}

function redirectWithResult(returnTo: string, result: AdminUserManagementResult): never {
  const url = new URL(returnTo, "https://skorly.local");
  const params = resultParams(result);
  url.searchParams.delete("notice");
  url.searchParams.delete("error");
  if (params.notice) url.searchParams.set("notice", params.notice);
  if (params.error) url.searchParams.set("error", params.error);
  redirect(`${url.pathname}${url.search}`);
}

async function setRoleAction(formData: FormData): Promise<void> {
  "use server";
  const returnTo = returnPathFromForm(formData);
  const result = await setAdminUserRole(
    String(formData.get("userId") ?? ""),
    String(formData.get("role") ?? ""),
    { confirmAdminChange: String(formData.get("adminConfirm") ?? "") === "ADMIN" },
  );
  redirectWithResult(returnTo, result);
}

async function setStatusAction(formData: FormData): Promise<void> {
  "use server";
  const returnTo = returnPathFromForm(formData);
  const result = await setAdminUserDeleted(
    String(formData.get("userId") ?? ""),
    String(formData.get("deleted") ?? "") === "true",
    { confirmAdminChange: String(formData.get("adminConfirm") ?? "") === "ADMIN" },
  );
  redirectWithResult(returnTo, result);
}

function formatDate(value: Date | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function userLabel(user: RuntimeAdminUserListItem): string {
  return user.displayName ?? user.email ?? user.id;
}

function roleClass(role: RuntimeAdminUserRole): string {
  if (role === "admin") return "bg-red-100 text-red-700";
  if (role === "premium") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
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

function UsersFilters({
  q,
  status,
  role,
}: {
  q: string;
  status: RuntimeAdminUserStatus;
  role: RuntimeAdminUserRole | "all";
}) {
  return (
    <form action="/admin/users" className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 lg:grid-cols-[minmax(0,1fr)_10rem_10rem_auto]">
      <input
        name="q"
        defaultValue={q}
        placeholder="Search email or display name"
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--brand)]"
      />
      <select
        name="status"
        defaultValue={status}
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
      >
        {USER_STATUSES.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
      <select
        name="role"
        defaultValue={role}
        className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
      >
        <option value="all">All roles</option>
        {USER_ROLES.map((item) => (
          <option key={item} value={item}>{item}</option>
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

function RoleForm({ user, returnTo }: { user: RuntimeAdminUserListItem; returnTo: string }) {
  return (
    <form action={setRoleAction} className="space-y-2">
      <input type="hidden" name="userId" value={user.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="flex flex-wrap gap-2">
        <select
          name="role"
          defaultValue={user.role}
          className="min-h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm"
        >
          {USER_ROLES.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--background)]"
        >
          Set role
        </button>
      </div>
      <input
        name="adminConfirm"
        placeholder="Type ADMIN for admin changes"
        className="min-h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs"
      />
    </form>
  );
}

function StatusForm({ user, returnTo }: { user: RuntimeAdminUserListItem; returnTo: string }) {
  const deleted = !user.deletedAt;
  return (
    <form action={setStatusAction} className="space-y-2">
      <input type="hidden" name="userId" value={user.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="deleted" value={String(deleted)} />
      <button
        type="submit"
        className={
          deleted
            ? "rounded-lg border border-red-500 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-500 hover:text-white"
            : "rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--background)]"
        }
      >
        {deleted ? "Deactivate" : "Restore"}
      </button>
      {user.role === "admin" && deleted ? (
        <input
          name="adminConfirm"
          placeholder="Type ADMIN to deactivate admin"
          className="min-h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs"
        />
      ) : null}
    </form>
  );
}

function UsersTable({ data, returnTo }: { data: RuntimeAdminUserList; returnTo: string }) {
  if (data.users.length === 0) {
    return (
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <h2 className="text-base font-semibold">No users found</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Adjust the search or filters.</p>
      </section>
    );
  }

  return (
    <section className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]">
          <tr>
            <th className="px-4 py-3 font-semibold">User</th>
            <th className="px-4 py-3 font-semibold">Role</th>
            <th className="px-4 py-3 font-semibold">Locale</th>
            <th className="px-4 py-3 font-semibold">Contact</th>
            <th className="px-4 py-3 font-semibold">Activity</th>
            <th className="px-4 py-3 font-semibold">Created</th>
            <th className="px-4 py-3 font-semibold">Manage</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {data.users.map((user) => (
            <tr key={user.id} className={user.deletedAt ? "bg-red-50/40" : undefined}>
              <td className="min-w-64 px-4 py-4 align-top">
                <div className="font-semibold">{userLabel(user)}</div>
                <div className="mt-1 font-mono text-xs text-[var(--muted)]">{user.id}</div>
                {user.deletedAt ? (
                  <div className="mt-2 text-xs font-semibold text-red-600">
                    Deactivated {formatDate(user.deletedAt)}
                  </div>
                ) : null}
              </td>
              <td className="px-4 py-4 align-top">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${roleClass(user.role)}`}>
                  {user.role}
                </span>
              </td>
              <td className="px-4 py-4 align-top">
                <span className="font-semibold uppercase">{user.locale}</span>
              </td>
              <td className="min-w-56 px-4 py-4 align-top">
                <div>{user.email ?? "-"}</div>
                <div className="mt-1 text-[var(--muted)]">{user.whatsappNumber ?? "-"}</div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  {user.consentMarketing ? `Marketing consent ${formatDate(user.consentAt)}` : "No marketing consent"}
                </div>
              </td>
              <td className="min-w-44 px-4 py-4 align-top text-[var(--muted)]">
                <div>{user.activity.predictions} predictions</div>
                <div>{user.activity.comments} comments</div>
                <div>{user.activity.pushSubscriptions} push subs</div>
                <div>{user.activity.subscriberMatches} subscriber matches</div>
              </td>
              <td className="whitespace-nowrap px-4 py-4 align-top text-[var(--muted)]">
                {formatDate(user.createdAt)}
              </td>
              <td className="min-w-72 px-4 py-4 align-top">
                <div className="grid gap-3">
                  <RoleForm user={user} returnTo={returnTo} />
                  <StatusForm user={user} returnTo={returnTo} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Pagination({ data }: { data: RuntimeAdminUserList }) {
  if (data.totalPages <= 1) return null;
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="text-[var(--muted)]">
        Page {data.page} of {data.totalPages}
      </div>
      <div className="flex gap-2">
        {data.page > 1 ? (
          <Link
            href={usersHref({
              q: data.query,
              status: data.status,
              role: data.role,
              page: data.page - 1,
            })}
            className="rounded-lg border border-[var(--border)] px-3 py-2 font-semibold hover:bg-[var(--card)]"
          >
            Previous
          </Link>
        ) : null}
        {data.page < data.totalPages ? (
          <Link
            href={usersHref({
              q: data.query,
              status: data.status,
              role: data.role,
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

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 80);
  const status = normalizeStatus(params.status);
  const role = normalizeRole(params.role);
  const page = normalizePage(params.page);
  const returnTo = usersHref({ q, status, role, page });
  const data = await getRuntimeAdminUsers({ query: q, status, role, page }).catch((error) => {
    console.warn("[admin] users query failed", error);
    return null;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-[var(--muted)]">
            Search profiles, review account status, and manage roles.
          </p>
        </div>
        {data ? (
          <div className="text-sm text-[var(--muted)]">
            <span className="font-semibold text-[var(--foreground)]">{data.total}</span> matching users
          </div>
        ) : null}
      </header>

      <Notice notice={params.notice} error={params.error} />
      <UsersFilters q={q} status={status} role={role} />

      {data ? (
        <>
          <UsersTable data={data} returnTo={returnTo} />
          <Pagination data={data} />
        </>
      ) : (
        <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900">
          <h2 className="text-base font-semibold">Users unavailable</h2>
          <p className="mt-2 text-sm">Unable to load user profiles right now.</p>
        </section>
      )}
    </div>
  );
}
