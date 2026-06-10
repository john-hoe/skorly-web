/**
 * S1 — daily 08:00 (WIB/ICT) match-day digest. One Web Push broadcast plus one
 * email per confirmed subscriber listing today's fixtures with local kickoff
 * times and a link to the schedule page. Skips entirely on days without
 * fixtures, so it goes quiet after the tournament.
 */
import { getUpcomingFixtures, getConfirmedSubscribers, getPushTargetsForTopic, type FixtureView } from "@skorly/db";
import { sendPush, type VapidConfig } from "./web-push";

const LOCALES = ["id", "vi", "en", "zh"] as const;
type Locale = (typeof LOCALES)[number];

const TZ: Record<Locale, { zone: string; label: string }> = {
  id: { zone: "Asia/Jakarta", label: "WIB" },
  vi: { zone: "Asia/Ho_Chi_Minh", label: "ICT" },
  en: { zone: "Asia/Manila", label: "PHT" },
  zh: { zone: "Asia/Shanghai", label: "北京时间" },
};

const SCHEDULE_PATH: Record<Locale, string> = {
  id: "/jadwal",
  vi: "/lich-thi-dau",
  en: "/schedule",
  zh: "/saicheng",
};

const COPY: Record<
  Locale,
  {
    subject: (n: number) => string;
    pushTitle: (n: number) => string;
    pushBody: (first: string, time: string) => string;
    lead: string;
    cta: string;
    foot: string;
  }
> = {
  id: {
    subject: (n) => `Jadwal hari ini: ${n} laga Piala Dunia`,
    pushTitle: (n) => `${n} laga Piala Dunia hari ini`,
    pushBody: (first, time) => `Mulai ${time}: ${first}. Tebak skornya sekarang!`,
    lead: "Laga hari ini — jam tayang waktu setempat. Pasang tebakanmu sebelum kickoff:",
    cta: "Lihat jadwal & tebak skor",
    foot: "Berhenti berlangganan",
  },
  vi: {
    subject: (n) => `Lịch hôm nay: ${n} trận World Cup`,
    pushTitle: (n) => `Hôm nay có ${n} trận World Cup`,
    pushBody: (first, time) => `Bắt đầu ${time}: ${first}. Dự đoán tỷ số ngay!`,
    lead: "Các trận hôm nay — giờ địa phương. Đặt dự đoán trước giờ bóng lăn:",
    cta: "Xem lịch & dự đoán tỷ số",
    foot: "Hủy đăng ký",
  },
  en: {
    subject: (n) => `Today's schedule: ${n} World Cup matches`,
    pushTitle: (n) => `${n} World Cup matches today`,
    pushBody: (first, time) => `First up ${time}: ${first}. Lock in your score pick!`,
    lead: "Today's matches — kickoff times shown in your local time. Make your picks before kickoff:",
    cta: "View schedule & predict",
    foot: "Unsubscribe",
  },
  zh: {
    subject: (n) => `今日赛程：${n} 场世界杯比赛`,
    pushTitle: (n) => `今天有 ${n} 场世界杯比赛`,
    pushBody: (first, time) => `${time} 开打：${first}。快来猜比分！`,
    lead: "今天的比赛（当地时间）。开赛前来猜个比分：",
    cta: "查看赛程并猜比分",
    foot: "退订",
  },
};

function readEnv(): Record<string, string | undefined> {
  return (
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
  );
}

function siteUrl(): string {
  return (readEnv().SITE_URL ?? "https://skorly.cc").replace(/\/$/, "");
}

function vapidFromEnv(): VapidConfig | null {
  const env = readEnv();
  const publicKey = env.VAPID_PUBLIC_KEY ?? env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  const subject = env.VAPID_SUBJECT ?? "mailto:business@skorly.cc";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

function fmtTime(date: Date, locale: Locale): string {
  const { zone, label } = TZ[locale];
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: zone,
  }).format(date);
  return `${time} ${label}`;
}

function matchLabel(f: FixtureView): string {
  return `${f.home.name} vs ${f.away.name}`;
}

/** Fixtures kicking off within the next 24 hours, soonest first. */
async function todaysFixtures(): Promise<FixtureView[]> {
  const all = await getUpcomingFixtures(64);
  const now = Date.now();
  const end = now + 24 * 60 * 60 * 1000;
  return all.filter((f) => {
    const t = f.kickoffAt ? new Date(f.kickoffAt).getTime() : 0;
    return t >= now - 30 * 60 * 1000 && t <= end;
  });
}

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

async function emailDigestForLocale(
  fixtures: FixtureView[],
  locale: Locale,
  base: string,
): Promise<number> {
  const recipients = await getConfirmedSubscribers(locale).catch(() => []);
  if (!recipients.length) return 0;

  const c = COPY[locale];
  const link = `${base}/${locale}${SCHEDULE_PATH[locale]}`;
  const rows = fixtures
    .map(
      (f) =>
        `<tr>
           <td style="padding:6px 10px;font-size:13px;color:#6b7280;white-space:nowrap">${
             f.kickoffAt ? fmtTime(new Date(f.kickoffAt), locale) : "-"
           }</td>
           <td style="padding:6px 10px;font-size:14px;font-weight:600">${matchLabel(f)}</td>
         </tr>`,
    )
    .join("");

  let sent = 0;
  for (const r of recipients) {
    const unsub = r.confirmToken
      ? `${base}/api/subscribe/unsubscribe?token=${encodeURIComponent(r.confirmToken)}&l=${locale}`
      : `${base}/${locale}`;
    const html = SHELL(
      locale,
      `<p style="font-size:15px;line-height:1.6;margin:0 0 12px">${c.lead}</p>
       <table style="border-collapse:collapse;width:100%">${rows}</table>
       <p style="text-align:center;margin:24px 0 8px">
         <a href="${link}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:10px">${c.cta}</a>
       </p>
       <p style="font-size:12px;color:#9ca3af;text-align:center"><a href="${unsub}" style="color:#9ca3af">${c.foot}</a></p>`,
    );
    if (await sendEmail(r.email, c.subject(fixtures.length), html)) sent++;
  }
  return sent;
}

export async function sendDailyDigest(): Promise<{
  fixtures: number;
  pushes: number;
  emails: number;
}> {
  const fixtures = await todaysFixtures();
  if (!fixtures.length) {
    console.log("[daily-digest] no fixtures in the next 24h — skipping");
    return { fixtures: 0, pushes: 0, emails: 0 };
  }

  const base = siteUrl();
  const first = fixtures[0]!;
  let pushes = 0;
  let emails = 0;

  // Push broadcast to match-notification subscribers ("kickoff" topic).
  const vapid = vapidFromEnv();
  if (vapid) {
    const targets = await getPushTargetsForTopic("kickoff").catch(() => []);
    for (const t of targets) {
      const locale = (LOCALES.includes(t.locale as Locale) ? t.locale : "id") as Locale;
      const c = COPY[locale];
      const payload = {
        title: c.pushTitle(fixtures.length),
        body: c.pushBody(
          matchLabel(first),
          first.kickoffAt ? fmtTime(new Date(first.kickoffAt), locale) : "",
        ),
        url: `${base}/${locale}${SCHEDULE_PATH[locale]}`,
        tag: `daily-digest-${new Date().toISOString().slice(0, 10)}`,
      };
      const res = await sendPush(t, payload, vapid).catch(() => ({ ok: false as const }));
      if (res.ok) pushes++;
    }
  }

  for (const locale of LOCALES) {
    emails += await emailDigestForLocale(fixtures, locale, base);
  }

  console.log(
    `[daily-digest] fixtures=${fixtures.length} pushes=${pushes} emails=${emails}`,
  );
  return { fixtures: fixtures.length, pushes, emails };
}
