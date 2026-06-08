import { NextResponse } from "next/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { sendEmail, optInEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/seo";
import { upsertRuntimeSubscriber } from "@/lib/runtime-data";
import { analyticsIdentityFromCookieHeader } from "@/lib/analytics";
import { trackServerAfter } from "@/lib/analytics-server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCALES = new Set(["id", "vi", "en", "zh"]);

/**
 * Lead capture with double opt-in. Validates + rate-limits + Turnstile,
 * persists an unconfirmed subscriber, and emails a confirmation link.
 * The gift/premium content is only released after confirmation.
 */
export async function POST(req: Request): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const consent = body.consent === true;
  const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp.trim() : "";
  const source = typeof body.source === "string" ? body.source.slice(0, 60) : null;
  const localeRaw = typeof body.locale === "string" ? body.locale : "id";
  const locale = LOCALES.has(localeRaw) ? localeRaw : "id";
  const token =
    typeof body.turnstileToken === "string" ? body.turnstileToken : null;

  if (!EMAIL_RE.test(email) || email.length > 254 || !consent) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const ip = clientIp(req.headers);
  const rl = await rateLimit(`subscribe:${ip}`, 5, 600);
  if (!rl.success) {
    return NextResponse.json({ ok: false, error: "rateLimited" }, { status: 429 });
  }

  const ok = await verifyTurnstile(token, ip);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "captcha" }, { status: 403 });
  }

  const confirmToken = crypto.randomUUID();
  try {
    const res = await upsertRuntimeSubscriber({
      email,
      whatsappNumber: whatsapp || null,
      locale,
      source,
      consentMarketing: true,
      ip,
      country: req.headers.get("cf-ipcountry"),
      userAgent: req.headers.get("user-agent"),
      confirmToken,
    });

    if (res.alreadyConfirmed) {
      // Idempotent: don't reveal status, just acknowledge.
      return NextResponse.json({ ok: true, pending: false });
    }

    const confirmUrl = `${SITE_URL}/api/subscribe/confirm?token=${res.confirmToken}&l=${locale}`;
    const { subject, html } = optInEmail(locale, confirmUrl);
    const emailSent = await sendEmail({ to: email, subject, html });
    if (!emailSent) {
      return NextResponse.json({ ok: false, error: "email" }, { status: 502 });
    }

    const analytics = analyticsIdentityFromCookieHeader(req.headers.get("cookie"));
    trackServerAfter(
      "email_subscribe",
      analytics.distinctId,
      { locale, source: source ?? "unknown" },
      {
        consentGranted: analytics.consentGranted,
        userAgent: req.headers.get("user-agent"),
        url: req.url,
      },
    );
    return NextResponse.json({ ok: true, pending: true });
  } catch {
    return NextResponse.json({ ok: false, error: "generic" }, { status: 500 });
  }
}
