"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  getOrCreateAnalyticsId,
  identifyAnalyticsUser,
  readAnalyticsConsent,
  setPostHogClient,
  subscribeToAnalyticsConsent,
  writeAnalyticsConsent,
  type ConsentState,
} from "@/lib/analytics";

const GA_SCRIPT_ID = "google-analytics-loader";
const ADSENSE_SCRIPT_ID = "google-adsense-loader";
const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

type AnalyticsProviderProps = {
  gaId?: string | null;
  posthogKey?: string | null;
  posthogHost?: string | null;
  adsenseClient?: string | null;
};

function ensureGtagStub() {
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ??
    function gtag() {
      // Google tag processes the Arguments object that the official snippet queues.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };
}

export function AnalyticsProvider({
  gaId,
  posthogKey,
  posthogHost,
  adsenseClient,
}: AnalyticsProviderProps) {
  const t = useTranslations("analyticsConsent");
  const consent = useSyncExternalStore(
    subscribeToAnalyticsConsent,
    readAnalyticsConsent,
    () => "loading" as ConsentState,
  );

  if (!gaId && !posthogKey && !adsenseClient) return null;

  const saveConsent = (nextConsent: Exclude<ConsentState, "loading" | "unset">) => {
    writeAnalyticsConsent(nextConsent);
  };

  return (
    <>
      <ConsentModeBridge consent={consent} />
      {adsenseClient ? <AdSenseScript client={adsenseClient} /> : null}
      {consent === "granted" ? <GoogleAnalyticsScripts gaId={gaId} /> : null}
      {consent === "granted" && posthogKey ? (
        <PostHogScripts posthogKey={posthogKey} posthogHost={posthogHost} />
      ) : null}
      {consent === "unset" ? (
        <ConsentBanner
          ariaLabel={t("ariaLabel")}
          title={t("title")}
          description={t("description")}
          accept={t("accept")}
          decline={t("decline")}
          onAccept={() => saveConsent("granted")}
          onDecline={() => saveConsent("denied")}
        />
      ) : null}
    </>
  );
}

/**
 * Consent Mode v2 bridge. Defaults everything to "denied" before any Google
 * script processes the queue, then mirrors the visitor's banner choice. With
 * consent denied Google serves only limited, non-personalized ads.
 */
function ConsentModeBridge({ consent }: { consent: ConsentState }) {
  const defaultsSet = useRef(false);

  useEffect(() => {
    ensureGtagStub();
    if (!defaultsSet.current) {
      defaultsSet.current = true;
      window.gtag?.("consent", "default", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    }
    if (consent === "granted" || consent === "denied") {
      const value = consent === "granted" ? "granted" : "denied";
      window.gtag?.("consent", "update", {
        analytics_storage: value,
        ad_storage: value,
        ad_user_data: value,
        ad_personalization: value,
      });
    }
  }, [consent]);

  return null;
}

/**
 * Loads the AdSense tag regardless of the banner choice: the tag doubles as
 * AdSense site verification, and ConsentModeBridge keeps ads limited and
 * non-personalized until the visitor accepts.
 */
function AdSenseScript({ client }: { client: string }) {
  useEffect(() => {
    ensureGtagStub();
    if (document.getElementById(ADSENSE_SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = ADSENSE_SCRIPT_ID;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    document.head.appendChild(script);
  }, [client]);

  return null;
}

function GoogleAnalyticsScripts({ gaId }: { gaId?: string | null }) {
  useEffect(() => {
    if (!gaId) return;

    ensureGtagStub();

    const configureAnalytics = () => {
      window.gtag?.("js", new Date());
      window.gtag?.("config", gaId, {
        anonymize_ip: true,
        send_page_view: true,
      });
    };

    configureAnalytics();

    if (document.getElementById(GA_SCRIPT_ID)) {
      return;
    }

    const script = document.createElement("script");
    script.id = GA_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(script);
  }, [gaId]);

  return null;
}

function PostHogScripts({
  posthogKey,
  posthogHost,
}: {
  posthogKey: string;
  posthogHost?: string | null;
}) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let cancelled = false;
    const distinctId = getOrCreateAnalyticsId();
    void import("posthog-js").then(({ default: posthog }) => {
      if (cancelled) return;
      posthog.init(posthogKey, {
        api_host: (posthogHost || DEFAULT_POSTHOG_HOST).replace(/\/$/, ""),
        capture_pageview: true,
        bootstrap: distinctId ? { distinctID: distinctId } : undefined,
        loaded: (client) => {
          setPostHogClient(client);
          void fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" })
            .then((response) => (response.ok ? response.json() : null))
            .then((payload: { userId?: unknown } | null) => {
              if (typeof payload?.userId === "string") {
                identifyAnalyticsUser(payload.userId);
              }
            })
            .catch(() => {});
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [posthogHost, posthogKey]);

  return null;
}

function ConsentBanner({
  ariaLabel,
  title,
  description,
  accept,
  decline,
  onAccept,
  onDecline,
}: {
  ariaLabel: string;
  title: string;
  description: string;
  accept: string;
  decline: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <section
      aria-label={ariaLabel}
      data-analytics-consent-banner="true"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,32,0.12)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-3xl">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            data-analytics-consent-decline="true"
            onClick={onDecline}
            className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-card"
          >
            {decline}
          </button>
          <button
            type="button"
            data-analytics-consent-accept="true"
            onClick={onAccept}
            className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            {accept}
          </button>
        </div>
      </div>
    </section>
  );
}
