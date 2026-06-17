/**
 * M4 — pre-match directed premium plan email. For fixtures kicking off within
 * the next window that have a published prediction article, email confirmed
 * subscribers a teaser + link to unlock the full plan on-site. Idempotent via
 * fixtures.premiumEmailedAt so a fixture is only broadcast once.
 */
import {
  getFixturesForPremiumEmail,
  getConfirmedSubscribers,
  getConfirmedWhatsappSubscribers,
  getArticlesForFixture,
  markFixturePremiumEmailed,
  type PremiumEmailTarget,
  type PremiumFixture,
  type WhatsappTarget,
} from "@skorly/db";
import { whatsappConfig, sendPremiumWhatsapp, type WhatsappConfig } from "./whatsapp";
import { PUBLIC_LOCALES, localizedSitePath } from "@skorly/types";

function readEnv(): Record<string, string | undefined> {
  return (
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
  );
}

function siteUrl(): string {
  return (readEnv().SITE_URL ?? "https://skorly.cc").replace(/\/$/, "");
}

const LOCALES = PUBLIC_LOCALES;

const COPY: Record<string, { subject: (m: string) => string; lead: string; cta: string; foot: string }> = {
  id: {
    subject: (m) => `Prediksi eksklusif: ${m}`,
    lead: "Analisis mendalam & tebakan skor kami sudah siap untuk laga ini. Buka rencana lengkapnya:",
    cta: "Buka prediksi lengkap",
    foot: "Berhenti berlangganan",
  },
  en: {
    subject: (m) => `Exclusive prediction: ${m}`,
    lead: "Our deep-dive analysis & score pick for this match are ready. Unlock the full plan:",
    cta: "Open full prediction",
    foot: "Unsubscribe",
  },
  vi: {
    subject: (m) => `Dự đoán độc quyền: ${m}`,
    lead: "Phân tích chuyên sâu & lựa chọn tỷ số của chúng tôi cho trận này đã sẵn sàng. Mở kế hoạch đầy đủ:",
    cta: "Mở dự đoán đầy đủ",
    foot: "Hủy đăng ký",
  },
  zh: {
    subject: (m) => `独家预测：${m}`,
    lead: "我们针对这场比赛的深度分析与推荐比分已就绪。解锁完整方案：",
    cta: "查看完整预测",
    foot: "退订",
  },
  th: {
    subject: (m) => `คาดการณ์พิเศษ: ${m}`,
    lead: "บทวิเคราะห์เชิงลึกและคาดการณ์สกอร์ของเราสำหรับแมตช์นี้พร้อมแล้ว เปิดแผนฉบับเต็ม:",
    cta: "เปิดคาดการณ์ฉบับเต็ม",
    foot: "ยกเลิกการสมัคร",
  },
};

const SHELL = (locale: string, body: string) => `<!doctype html>
<html lang="${locale}"><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:linear-gradient(135deg,#16a34a,#064e3b);border-radius:16px;padding:24px;color:#fff">
      <div style="font-size:26px;font-weight:800">Skor<span style="color:#bbf7d0">ly</span></div>
    </div>
    <div style="background:#fff;border-radius:16px;padding:24px;margin-top:12px">
      ${body}
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">skorly.cc · World Cup 2026</p>
  </div>
</body></html>`;

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const env = readEnv();
  const key = env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.RESEND_FROM ?? "Skorly <noreply@skorly.cc>",
        to,
        subject,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function plainPreview(md: string, max = 220): string {
  return md
    .replace(/[#*_>`[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

async function emailFixtureForLocale(
  fixture: PremiumFixture,
  locale: string,
  recipients: PremiumEmailTarget[],
  base: string,
): Promise<number> {
  if (!recipients.length) return 0;
  const arts = await getArticlesForFixture(fixture.fixtureId, locale).catch(() => []);
  const prediction = arts.find((a) => a.type === "prediction");
  if (!prediction) return 0;

  const c = COPY[locale] ?? COPY.en!;
  const match = `${fixture.homeName} vs ${fixture.awayName}`;
  const preview = prediction.summary?.trim() || plainPreview(prediction.body);
  let sent = 0;
  for (const r of recipients) {
    const link = `${base}${localizedSitePath(locale, "match", { slug: fixture.slug })}`;
    const unsub = r.confirmToken
      ? `${base}/api/subscribe/unsubscribe?token=${encodeURIComponent(r.confirmToken)}&l=${locale}`
      : `${base}/${locale}`;
    const html = SHELL(
      locale,
      `<h2 style="margin:0 0 8px;font-size:20px">${match}</h2>
       <p style="font-size:15px;line-height:1.6">${c.lead}</p>
       <p style="font-size:14px;color:#4b5563;line-height:1.6;border-left:3px solid #16a34a;padding-left:12px">${preview}…</p>
       <p style="text-align:center;margin:24px 0">
         <a href="${link}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:10px">${c.cta}</a>
       </p>
       <p style="font-size:12px;color:#9ca3af;text-align:center"><a href="${unsub}" style="color:#9ca3af">${c.foot}</a></p>`,
    );
    if (await sendEmail(r.email, c.subject(match), html)) sent++;
  }
  return sent;
}

/**
 * M7 — fan out the same pre-match premium plan to WhatsApp recipients for one
 * fixture/locale. No-op unless a fixture has a prediction article and the
 * WhatsApp Cloud API is provisioned. Reuses the email opt-in/consent gate.
 */
async function whatsappFixtureForLocale(
  cfg: WhatsappConfig,
  fixture: PremiumFixture,
  locale: string,
  recipients: WhatsappTarget[],
  base: string,
): Promise<number> {
  if (!recipients.length) return 0;
  const arts = await getArticlesForFixture(fixture.fixtureId, locale).catch(() => []);
  if (!arts.some((a) => a.type === "prediction")) return 0;

  const match = `${fixture.homeName} vs ${fixture.awayName}`;
  const link = `${base}${localizedSitePath(locale, "match", { slug: fixture.slug })}`;
  let sent = 0;
  for (const r of recipients) {
    if (await sendPremiumWhatsapp(cfg, r.whatsappNumber, locale, match, link)) sent++;
  }
  return sent;
}

export async function sendPremiumEmails(): Promise<{
  fixtures: number;
  emails: number;
  whatsapp: number;
}> {
  const env = readEnv();
  const wa = whatsappConfig();
  if (!env.RESEND_API_KEY && !wa) {
    console.warn("[premium-email] no RESEND_API_KEY or WhatsApp config — skipping");
    return { fixtures: 0, emails: 0, whatsapp: 0 };
  }
  const base = siteUrl();
  const fixtures = await getFixturesForPremiumEmail(12).catch(() => []);
  if (!fixtures.length) return { fixtures: 0, emails: 0, whatsapp: 0 };

  // Pre-fetch recipients per locale once (email + WhatsApp share the opt-in).
  const byLocale = new Map<string, PremiumEmailTarget[]>();
  const waByLocale = new Map<string, WhatsappTarget[]>();
  for (const locale of LOCALES) {
    byLocale.set(
      locale,
      env.RESEND_API_KEY ? await getConfirmedSubscribers(locale).catch(() => []) : [],
    );
    waByLocale.set(
      locale,
      wa ? await getConfirmedWhatsappSubscribers(locale).catch(() => []) : [],
    );
  }

  let emails = 0;
  let whatsapp = 0;
  for (const fixture of fixtures) {
    for (const locale of LOCALES) {
      if (env.RESEND_API_KEY) {
        emails += await emailFixtureForLocale(
          fixture,
          locale,
          byLocale.get(locale) ?? [],
          base,
        );
      }
      if (wa) {
        whatsapp += await whatsappFixtureForLocale(
          wa,
          fixture,
          locale,
          waByLocale.get(locale) ?? [],
          base,
        );
      }
    }
    await markFixturePremiumEmailed(fixture.fixtureId).catch(() => {});
  }
  return { fixtures: fixtures.length, emails, whatsapp };
}
