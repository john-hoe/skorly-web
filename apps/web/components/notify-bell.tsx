"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { subscribePushApi, unsubscribePushApi } from "@/lib/runtime-api-client";
import { track } from "@/lib/analytics";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const DEFAULT_TOPICS = {
  kickoff: true,
  goals: true,
  predictionResult: true,
};
const DEFAULT_TOPIC_LABEL = "kickoff,goals,prediction_result";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "idle" | "subscribed" | "denied" | "unsupported" | "busy";

export function NotifyBell({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("push");
  const locale = useLocale();
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    let active = true;
    async function syncState() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !VAPID
      ) {
        if (active) setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (active) setState("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (active) setState(sub ? "subscribed" : "idle");
      } catch {
        if (active) setState("idle");
      }
    }
    void syncState();
    return () => {
      active = false;
    };
  }, []);

  async function enable() {
    setState("busy");
    try {
      track("push_prompt_shown", {
        source: compact ? "header_compact" : "header",
        topics: DEFAULT_TOPIC_LABEL,
      });
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "idle");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID),
      });
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setState("idle");
        return;
      }
      const res = await subscribePushApi(
        { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
        { locale, topics: DEFAULT_TOPICS },
      );
      setState(res.ok ? "subscribed" : "idle");
    } catch {
      setState("idle");
    }
  }

  async function disable() {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribePushApi(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("idle");
    } catch {
      setState("subscribed");
    }
  }

  if (state === "unsupported") return null;

  const base =
    "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm transition";

  if (state === "denied") {
    return (
      <span
        className={`${base} text-[var(--muted)]`}
        title={t("deniedLabel")}
        aria-label={t("deniedLabel")}
      >
        🔕 {compact ? "" : t("denied")}
      </span>
    );
  }

  if (state === "subscribed") {
    const label = t("onLabel");
    return (
      <button
        onClick={disable}
        className={`${base} hover:border-[var(--brand)]`}
        aria-label={label}
        title={label}
      >
        🔔 {compact ? "" : t("on")}
      </button>
    );
  }

  const label = state === "busy" ? t("busyLabel") : t("enableLabel");
  return (
    <button
      onClick={enable}
      disabled={state === "busy"}
      className={`${base} hover:border-[var(--brand)] disabled:opacity-60`}
      aria-label={label}
      title={label}
    >
      🔔 {compact ? "" : state === "busy" ? t("busy") : t("enable")}
    </button>
  );
}
