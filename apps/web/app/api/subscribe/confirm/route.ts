import { SITE_URL } from "@/lib/seo";
import { ALL_LOCALES } from "@/i18n/locales";
import { confirmRuntimeSubscriber } from "@/lib/runtime-data";

const LOCALES = new Set<string>(ALL_LOCALES);

const MSG: Record<string, { ok: string; bad: string }> = {
  id: { ok: "Langganan dikonfirmasi! 🎉", bad: "Tautan tidak valid atau kedaluwarsa." },
  en: { ok: "Subscription confirmed! 🎉", bad: "This link is invalid or expired." },
  vi: { ok: "Đã xác nhận đăng ký! 🎉", bad: "Liên kết không hợp lệ hoặc đã hết hạn." },
  zh: { ok: "订阅已确认！🎉", bad: "链接无效或已过期。" },
  th: { ok: "ยืนยันการสมัครรับข่าวสารแล้ว! 🎉", bad: "ลิงก์ไม่ถูกต้องหรือหมดอายุ" },
};

function page(locale: string, ok: boolean): Response {
  const m = MSG[locale] ?? MSG.en!;
  const text = ok ? m.ok : m.bad;
  const home = `${SITE_URL}/${locale}`;
  const html = `<!doctype html><html lang="${locale}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Skorly</title></head>
<body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
<div style="max-width:480px;margin:64px auto;padding:32px;background:#fff;border-radius:16px;text-align:center">
  <div style="font-size:28px;font-weight:800;color:#16a34a">Skorly</div>
  <p style="font-size:18px;margin:24px 0">${text}</p>
  <a href="${home}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:10px">skorly.cc</a>
</div></body></html>`;
  return new Response(html, {
    status: ok ? 200 : 400,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const lRaw = url.searchParams.get("l") ?? "id";
  const locale = LOCALES.has(lRaw) ? lRaw : "id";

  const result = await confirmRuntimeSubscriber(token).catch(() => null);
  return page(locale, !!result);
}
