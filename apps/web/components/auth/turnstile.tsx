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

/**
 * Cloudflare Turnstile widget. Explicitly rendered so it works after client
 * navigation. The site key is fetched after mount so Cloudflare runtime env on
 * the server cannot make SSR markup diverge from the browser bundle's first
 * render. Injects a hidden `cf-turnstile-response` input into its parent <form>,
 * which the server action verifies. Renders nothing if no site key is
 * configured; production server verification still fails closed without a valid
 * token.
 */
/** Turnstile's flexible size still enforces a 300px minimum widget width. */
const MIN_WIDGET_WIDTH = 300;
const WIDGET_HEIGHT = 65;

export function Turnstile() {
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const outerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  // Narrow containers (e.g. the sidebar subscribe card) are thinner than the
  // 300px minimum, which made the widget overflow the card border; shrink the
  // whole widget proportionally instead.
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      setScale(w > 0 && w < MIN_WIDGET_WIDTH ? w / MIN_WIDGET_WIDTH : 1);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [siteKey]);

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
  return (
    <div
      ref={outerRef}
      className="w-full overflow-hidden"
      style={scale < 1 ? { height: Math.ceil(WIDGET_HEIGHT * scale) } : undefined}
    >
      <div
        style={
          scale < 1
            ? {
                width: MIN_WIDGET_WIDTH,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }
            : undefined
        }
      >
        <div ref={ref} className="cf-turnstile" />
      </div>
    </div>
  );
}
