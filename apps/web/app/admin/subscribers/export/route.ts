import { requireAdmin } from "@/lib/admin";
import {
  getRuntimeAdminSubscriberExportRows,
  type RuntimeAdminSubscriberListParams,
  type RuntimeAdminSubscriberListItem,
} from "@/lib/runtime-data";

export const dynamic = "force-dynamic";

function dateValue(value: Date | null): string {
  return value ? value.toISOString() : "";
}

function csvEscape(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  const text = /^\s*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function rowToCsv(row: RuntimeAdminSubscriberListItem): string[] {
  return [
    row.id,
    row.email,
    row.whatsappNumber,
    row.locale,
    row.source,
    row.country,
    row.consentMarketing,
    dateValue(row.consentAt),
    dateValue(row.confirmedAt),
    row.giftSent,
    dateValue(row.giftSentAt),
    dateValue(row.unsubscribedAt),
    dateValue(row.createdAt),
  ].map(csvEscape);
}

export async function GET(request: Request): Promise<Response> {
  await requireAdmin();
  const url = new URL(request.url);
  const params: RuntimeAdminSubscriberListParams = {
    query: url.searchParams.get("q") ?? undefined,
    status: (url.searchParams.get("status") ?? undefined) as RuntimeAdminSubscriberListParams["status"],
    confirmation: (url.searchParams.get("confirmation") ?? undefined) as RuntimeAdminSubscriberListParams["confirmation"],
    channel: (url.searchParams.get("channel") ?? undefined) as RuntimeAdminSubscriberListParams["channel"],
    locale: url.searchParams.get("locale") ?? undefined,
  };

  const rows = await getRuntimeAdminSubscriberExportRows(params).catch((error) => {
    console.warn("[admin] subscriber export failed", error);
    return null;
  });
  if (!rows) {
    return new Response("Subscriber export unavailable", { status: 502 });
  }

  const header = [
    "id",
    "email",
    "whatsapp_number",
    "locale",
    "source",
    "country",
    "consent_marketing",
    "consent_at",
    "confirmed_at",
    "gift_sent",
    "gift_sent_at",
    "unsubscribed_at",
    "created_at",
  ];
  const csv = [header, ...rows.map(rowToCsv)].map((line) => line.join(",")).join("\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="skorly-subscribers-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
