import { json, readJson } from "@/lib/api/http";
import { analyticsIdentityFromCookieHeader } from "@/lib/analytics";
import { trackServerAfter } from "@/lib/analytics-server";
import { isLocale } from "@/i18n/locales";

type PwaEventBody = {
  event?: "notification_click" | "offline_fallback_seen";
  target?: string;
  path?: string;
  locale?: string;
};

export async function POST(request: Request) {
  const input = await readJson<PwaEventBody>(request);
  if (!input?.event) return json({ ok: false }, { status: 400 });

  const analytics = analyticsIdentityFromCookieHeader(request.headers.get("cookie"));
  if (input.event === "notification_click") {
    trackServerAfter(
      "notification_click",
      analytics.distinctId,
      { target: cleanPath(input.target ?? "/") },
      {
        consentGranted: analytics.consentGranted,
        userAgent: request.headers.get("user-agent"),
        url: request.url,
      },
    );
    return json({ ok: true });
  }

  if (input.event === "offline_fallback_seen") {
    const localeInput = input.locale ?? "";
    const locale = isLocale(localeInput) ? localeInput : "id";
    trackServerAfter(
      "offline_fallback_seen",
      analytics.distinctId,
      { path: cleanPath(input.path ?? "/"), locale },
      {
        consentGranted: analytics.consentGranted,
        userAgent: request.headers.get("user-agent"),
        url: request.url,
      },
    );
    return json({ ok: true });
  }

  return json({ ok: false }, { status: 400 });
}

function cleanPath(value: string): string {
  try {
    const url = new URL(value, "https://skorly.cc");
    return url.pathname.slice(0, 240);
  } catch {
    return value.split(/[?#]/, 1)[0]?.slice(0, 240) || "/";
  }
}
