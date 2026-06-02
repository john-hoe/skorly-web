"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { subscribePush, unsubscribePush } from "@/lib/push-actions";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

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
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !VAPID
    ) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "subscribed" : "idle"))
      .catch(() => setState("idle"));
  }, []);

  async function enable() {
    setState("busy");
    try {
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
      const res = await subscribePush(
        { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
        { locale },
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
        await unsubscribePush(sub.endpoint);
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
      <span className={`${base} text-[var(--muted)]`} title={t("denied")}>
        🔕 {compact ? "" : t("denied")}
      </span>
    );
  }

  if (state === "subscribed") {
    return (
      <button onClick={disable} className={`${base} hover:border-[var(--brand)]`}>
        🔔 {compact ? "" : t("on")}
      </button>
    );
  }

  return (
    <button
      onClick={enable}
      disabled={state === "busy"}
      className={`${base} hover:border-[var(--brand)] disabled:opacity-60`}
    >
      🔔 {compact ? "" : state === "busy" ? t("busy") : t("enable")}
    </button>
  );
}
