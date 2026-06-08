export const ANALYTICS_CONSENT_COOKIE = "skorly_analytics_consent";
export const ANALYTICS_ID_COOKIE = "skorly_analytics_id";
export const ANALYTICS_STORAGE_KEY = "skorly.analytics.consent";
export const ANALYTICS_CHANGE_EVENT = "skorly-analytics-consent-change";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";
const SERVER_ANALYTICS_TIMEOUT_MS = 1500;

export type ConsentState = "loading" | "granted" | "denied" | "unset";

type AnalyticsPrimitive = string | number | boolean | null;
type AnalyticsPayload = Record<string, AnalyticsPrimitive | undefined>;

export type AnalyticsEventMap = {
  predict_submit: {
    fixtureId: number;
    league?: string;
    home?: string;
    away?: string;
    predHome: number;
    predAway: number;
  };
  bracket_save: { numPicks: number; championTeamId: number | null };
  signup: { method: "email" | "oauth" | "google" | "facebook" };
  login: { method: "email" | "oauth" | "google" | "facebook" };
  push_opt_in: Record<string, never>;
  push_opt_out: Record<string, never>;
  email_subscribe: { locale: string; source: string };
  league_create: { leagueId: number };
  league_join: { leagueId: number };
  comment_post: { targetType: "article" | "prediction"; targetId: string };
  share_click: { channel: string; contentType: string; contentId: string };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;

type PostHogClient = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (distinctId: string) => void;
};

let postHogClient: PostHogClient | null = null;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function setPostHogClient(client: PostHogClient | null): void {
  postHogClient = client;
}

export function readAnalyticsConsent(): ConsentState {
  if (typeof window === "undefined") return "loading";

  try {
    const stored = window.localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (stored === "granted" || stored === "denied") return stored;
  } catch {
    /* ignore blocked storage */
  }

  const cookieValue = readCookieFromDocument(ANALYTICS_CONSENT_COOKIE);
  if (cookieValue === "granted" || cookieValue === "denied") {
    return cookieValue;
  }

  return "unset";
}

export function writeAnalyticsConsent(consent: "granted" | "denied"): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(ANALYTICS_STORAGE_KEY, consent);
  } catch {
    /* ignore blocked storage */
  }

  writeDocumentCookie(ANALYTICS_CONSENT_COOKIE, consent);
  if (consent === "granted") {
    getOrCreateAnalyticsId();
  }
  window.dispatchEvent(new Event(ANALYTICS_CHANGE_EVENT));
}

export function subscribeToAnalyticsConsent(onStoreChange: () => void): () => void {
  window.addEventListener(ANALYTICS_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(ANALYTICS_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function getOrCreateAnalyticsId(): string | null {
  if (typeof window === "undefined" || readAnalyticsConsent() !== "granted") return null;

  const existing = readCookieFromDocument(ANALYTICS_ID_COOKIE);
  if (existing) return existing;

  const id = crypto.randomUUID();
  writeDocumentCookie(ANALYTICS_ID_COOKIE, id);
  return id;
}

export function track<Event extends AnalyticsEventName>(
  event: Event,
  properties: AnalyticsEventMap[Event],
): void {
  if (typeof window === "undefined" || readAnalyticsConsent() !== "granted") return;

  const distinctId = getOrCreateAnalyticsId();
  const clean = cleanProperties(properties);
  postHogClient?.capture(event, clean);
  window.gtag?.("event", event, {
    ...clean,
    ...(distinctId ? { client_id: distinctId } : {}),
  });
}

export function identifyAnalyticsUser(userId: string | null | undefined): void {
  if (!userId || typeof window === "undefined" || readAnalyticsConsent() !== "granted") return;

  getOrCreateAnalyticsId();
  postHogClient?.identify(userId);
  window.gtag?.("set", { user_id: userId });
}

export function analyticsIdentityFromCookieHeader(
  cookieHeader: string | null | undefined,
  userId?: string | null,
): { consentGranted: boolean; distinctId: string | null; anonymousId: string | null } {
  const consent = readCookieFromHeader(cookieHeader, ANALYTICS_CONSENT_COOKIE);
  const anonymousId = readCookieFromHeader(cookieHeader, ANALYTICS_ID_COOKIE);
  const consentGranted = consent === "granted";
  return {
    consentGranted,
    distinctId: consentGranted ? userId ?? anonymousId : null,
    anonymousId,
  };
}

export async function trackServer<Event extends AnalyticsEventName>(
  event: Event,
  distinctId: string | null | undefined,
  properties: AnalyticsEventMap[Event],
  options: {
    consentGranted: boolean;
    userId?: string | null;
    userAgent?: string | null;
    url?: string | null;
  },
): Promise<void> {
  if (!options.consentGranted || !distinctId) return;

  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = (process.env.NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_POSTHOG_HOST).replace(
    /\/$/,
    "",
  );
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const gaSecret = process.env.GA4_API_SECRET;
  const clean = cleanProperties(properties);
  const signal = AbortSignal.timeout(SERVER_ANALYTICS_TIMEOUT_MS);

  try {
    const tasks: Promise<unknown>[] = [];
    if (posthogKey) {
      tasks.push(
        fetch(`${posthogHost}/capture/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: posthogKey,
            event,
            distinct_id: distinctId,
            properties: {
              ...clean,
              ...(options.userId ? { user_id: options.userId } : {}),
              ...(options.userAgent ? { $user_agent: options.userAgent } : {}),
              ...(options.url ? { $current_url: options.url } : {}),
            },
          }),
          cache: "no-store",
          signal,
        }),
      );
    }

    if (gaId && gaSecret) {
      const endpoint = new URL("https://www.google-analytics.com/mp/collect");
      endpoint.searchParams.set("measurement_id", gaId);
      endpoint.searchParams.set("api_secret", gaSecret);
      tasks.push(
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: distinctId,
            ...(options.userId ? { user_id: options.userId } : {}),
            events: [{ name: event, params: clean }],
          }),
          cache: "no-store",
          signal,
        }),
      );
    }

    await Promise.allSettled(tasks);
  } catch {
    /* analytics must never break product flows */
  }
}

function cleanProperties(input: AnalyticsPayload): Record<string, AnalyticsPrimitive> {
  return Object.fromEntries(
    Object.entries(input).filter((entry): entry is [string, AnalyticsPrimitive] => {
      const value = entry[1];
      return value !== undefined;
    }),
  );
}

function readCookieFromDocument(name: string): string | null {
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split("=")[1] ?? null;
}

function readCookieFromHeader(
  cookieHeader: string | null | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  return (
    cookieHeader
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(`${name}=`))
      ?.split("=")[1] ?? null
  );
}

function writeDocumentCookie(name: string, value: string): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}
