"use client";

import { useEffect, useRef, useState } from "react";
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const BUILD_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null;

/**
 * Cloudflare Turnstile widget. Explicitly rendered so it works after client
 * navigation. Injects a hidden `cf-turnstile-response` input into its parent
 * <form>, which the server action verifies. Renders nothing if no site key is
 * configured; production server verification still fails closed without a
 * valid token.
 */
export function Turnstile() {
  const [siteKey, setSiteKey] = useState<string | null>(BUILD_SITE_KEY);
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (siteKey) return;
    let cancelled = false;

    fetch("/api/turnstile/site-key")
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { siteKey?: unknown } | null) => {
        if (!cancelled && typeof payload?.siteKey === "string" && payload.siteKey) {
          setSiteKey(payload.siteKey);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [siteKey]);

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;

    const render = () => {
      if (cancelled || !ref.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        theme: "auto",
        size: "flexible",
      });
    };

    if (window.turnstile) {
      render();
    } else if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onload = render;
      document.head.appendChild(s);
    } else {
      const timer = setInterval(() => {
        if (window.turnstile) {
          clearInterval(timer);
          render();
        }
      }, 200);
      return () => clearInterval(timer);
    }

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* noop */
        }
        widgetId.current = null;
      }
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={ref} className="cf-turnstile" />;
}
