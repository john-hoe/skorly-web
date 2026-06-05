"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

const CONSENT_COOKIE = "skorly_analytics_consent";
const CONSENT_STORAGE_KEY = "skorly.analytics.consent";
const CONSENT_CHANGE_EVENT = "skorly-analytics-consent-change";
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const GA_SCRIPT_ID = "google-analytics-loader";

type ConsentState = "loading" | "granted" | "denied" | "unset";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

type AnalyticsProviderProps = {
  gaId?: string | null;
};

export function AnalyticsProvider({ gaId }: AnalyticsProviderProps) {
  const t = useTranslations("analyticsConsent");
  const consent = useSyncExternalStore(
    subscribeToAnalyticsConsent,
    readAnalyticsConsent,
    () => "loading" as ConsentState,
  );

  if (!gaId) return null;

  const saveConsent = (nextConsent: Exclude<ConsentState, "loading" | "unset">) => {
    writeAnalyticsConsent(nextConsent);
  };

  return (
    <>
      {consent === "granted" ? <GoogleAnalyticsScripts gaId={gaId} /> : null}
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

function GoogleAnalyticsScripts({ gaId }: { gaId: string }) {
  useEffect(() => {
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ??
      function gtag() {
        // Google tag processes the Arguments object that the official snippet queues.
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer?.push(arguments);
      };

    const configureAnalytics = () => {
      window.gtag?.("consent", "update", {
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
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

function readAnalyticsConsent(): ConsentState {
  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored === "granted" || stored === "denied") return stored;
  } catch {
    /* ignore blocked storage */
  }

  const cookieValue = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CONSENT_COOKIE}=`))
    ?.split("=")[1];

  if (cookieValue === "granted" || cookieValue === "denied") {
    return cookieValue;
  }

  return "unset";
}

function writeAnalyticsConsent(consent: "granted" | "denied") {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, consent);
  } catch {
    /* ignore blocked storage */
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${consent}; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

function subscribeToAnalyticsConsent(onStoreChange: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}
