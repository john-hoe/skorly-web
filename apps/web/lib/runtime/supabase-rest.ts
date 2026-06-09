const DEFAULT_TIMEOUT_MS = 8_000;

export class SupabaseRestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "SupabaseRestError";
  }
}

function restConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new SupabaseRestError("Supabase REST service role configuration is missing");
  }
  return { url: url.replace(/\/$/, ""), key };
}

function restUrl(path: string, params?: URLSearchParams) {
  const { url } = restConfig();
  const out = new URL(path.startsWith("/") ? path : `/rest/v1/${path}`, url);
  if (params) {
    for (const [key, value] of params.entries()) out.searchParams.append(key, value);
  }
  return out;
}

async function request<T>(
  path: string,
  init: RequestInit & { params?: URLSearchParams; timeoutMs?: number } = {},
): Promise<{ data: T; response: Response }> {
  const { key } = restConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  if (typeof timer === "object" && "unref" in timer) timer.unref();

  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${key}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(restUrl(path, init.params), {
      ...init,
      headers,
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await response.text();
    if (!response.ok) {
      throw new SupabaseRestError(
        `Supabase REST ${init.method ?? "GET"} ${path} failed with ${response.status}`,
        response.status,
        text,
      );
    }
    const data = text ? (JSON.parse(text) as T) : ([] as T);
    return { data, response };
  } catch (error) {
    if (error instanceof SupabaseRestError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new SupabaseRestError(`Supabase REST ${init.method ?? "GET"} ${path} timed out`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function params(input: Record<string, string | number | boolean | null | undefined>) {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value != null) out.append(key, String(value));
  }
  return out;
}

export async function selectRows<T>(
  table: string,
  query: Record<string, string | number | boolean | null | undefined>,
): Promise<T[]> {
  const { data } = await request<T[]>(table, { params: params(query) });
  return data;
}

export async function selectRowsWithCount<T>(
  table: string,
  query: Record<string, string | number | boolean | null | undefined>,
): Promise<{ rows: T[]; total: number }> {
  const { data, response } = await request<T[]>(table, {
    params: params(query),
    headers: { Prefer: "count=exact" },
  });
  const range = response.headers.get("content-range");
  const total = range?.split("/")[1];
  return { rows: data, total: total && total !== "*" ? Number(total) || 0 : data.length };
}

export async function selectCount(
  table: string,
  query: Record<string, string | number | boolean | null | undefined>,
): Promise<number> {
  const { response } = await request<unknown[]>(table, {
    params: params({ ...query, select: query.select ?? "id" }),
    headers: { Prefer: "count=exact" },
  });
  const range = response.headers.get("content-range");
  const total = range?.split("/")[1];
  return total && total !== "*" ? Number(total) || 0 : 0;
}

export async function callRpc<T>(
  name: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const { data } = await request<T>(`/rest/v1/rpc/${name}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data;
}

export async function insertRows<T>(
  table: string,
  body: unknown,
  opts: { returning?: boolean } = {},
): Promise<T[]> {
  const { data } = await request<T[]>(table, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { Prefer: opts.returning === false ? "return=minimal" : "return=representation" },
  });
  return data;
}

export async function upsertRows<T>(
  table: string,
  body: unknown,
  onConflict: string,
  opts: { returning?: boolean } = {},
): Promise<T[]> {
  const { data } = await request<T[]>(table, {
    method: "POST",
    params: params({ on_conflict: onConflict }),
    body: JSON.stringify(body),
    headers: {
      Prefer:
        opts.returning === false
          ? "resolution=merge-duplicates,return=minimal"
          : "resolution=merge-duplicates,return=representation",
    },
  });
  return data;
}

export async function updateRows<T>(
  table: string,
  query: Record<string, string | number | boolean | null | undefined>,
  body: unknown,
  opts: { returning?: boolean } = {},
): Promise<T[]> {
  const { data } = await request<T[]>(table, {
    method: "PATCH",
    params: params(query),
    body: JSON.stringify(body),
    headers: { Prefer: opts.returning === false ? "return=minimal" : "return=representation" },
  });
  return data;
}

export async function deleteRows(
  table: string,
  query: Record<string, string | number | boolean | null | undefined>,
) {
  await request(table, {
    method: "DELETE",
    params: params(query),
    headers: { Prefer: "return=minimal" },
  });
}

export function inFilter(values: Array<string | number>) {
  return `in.(${values.join(",")})`;
}
