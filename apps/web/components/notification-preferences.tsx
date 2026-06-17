"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  subscribePushApi,
  unsubscribePushApi,
  type BrowserSubscription,
} from "@/lib/runtime-api-client";
import { track } from "@/lib/analytics";
import type { RuntimePushTopics } from "@/lib/runtime-data";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const STORAGE_KEY = "skorly.pushTopics";
const TOPICS = ["kickoff", "goals", "predictionResult"] as const;
const DEFAULT_TOPICS = {
  kickoff: true,
  goals: true,
  predictionResult: true,
} satisfies Required<RuntimePushTopics>;

type TopicKey = (typeof TOPICS)[number];
type State = "idle" | "subscribed" | "denied" | "unsupported" | "busy";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function readStoredTopics(): Required<RuntimePushTopics> {
  if (typeof window === "undefined") return DEFAULT_TOPICS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TOPICS;
    const parsed = JSON.parse(raw) as RuntimePushTopics;
    return {
      kickoff: parsed.kickoff ?? true,
      goals: parsed.goals ?? true,
      predictionResult: parsed.predictionResult ?? true,
    };
  } catch {
    return DEFAULT_TOPICS;
  }
}

function writeStoredTopics(topics: Required<RuntimePushTopics>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(topics));
  } catch {
    /* storage is optional */
  }
}

function topicLabel(topics: Required<RuntimePushTopics>): string {
  return TOPICS.filter((key) => topics[key]).join(",");
}

function subscriptionPayload(sub: PushSubscription): BrowserSubscription | null {
  const json = sub.toJSON() as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return null;
  return {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  };
}

function supportsPush(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    Boolean(VAPID)
  );
}

export function NotificationPreferences() {
  const t = useTranslations("pushPreferences");
  const locale = useLocale();
  const [state, setState] = useState<State>("idle");
  const [topics, setTopics] = useState<Required<RuntimePushTopics>>(() => readStoredTopics());
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function syncState() {
      if (!supportsPush()) {
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

  function updateTopic(key: TopicKey, checked: boolean) {
    setTopics((current) => ({ ...current, [key]: checked }));
    setMessage(null);
  }

  async function save() {
    if (!supportsPush()) {
      setState("unsupported");
      return;
    }

    setState("busy");
    setMessage(null);
    try {
      track("push_prompt_shown", {
        source: "account_preferences",
        topics: topicLabel(topics),
      });
      let permission = Notification.permission;
      if (permission !== "granted") {
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "idle");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID),
        });
      }
      const payload = subscriptionPayload(sub);
      if (!payload) {
        setState("idle");
        setMessage(t("error"));
        return;
      }

      const res = await subscribePushApi(payload, { locale, topics });
      if (!res.ok) {
        setState("idle");
        setMessage(t("error"));
        return;
      }
      writeStoredTopics(topics);
      setState("subscribed");
      setMessage(t("saved"));
    } catch {
      setState("idle");
      setMessage(t("error"));
    }
  }

  async function disable() {
    if (!supportsPush()) return;

    setState("busy");
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribePushApi(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("idle");
      setMessage(t("disabled"));
    } catch {
      setState("subscribed");
      setMessage(t("error"));
    }
  }

  const disabled = state === "busy" || state === "unsupported" || state === "denied";

  return (
    <section className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="space-y-1">
        <h2 className="text-lg font-bold">{t("title")}</h2>
        <p className="text-sm leading-6 text-[var(--muted)]">{t("description")}</p>
      </div>

      <div className="grid gap-3">
        {TOPICS.map((key) => (
          <label
            key={key}
            className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3"
          >
            <input
              type="checkbox"
              checked={topics[key]}
              disabled={state === "busy"}
              onChange={(event) => updateTopic(key, event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--brand)]"
            />
            <span>
              <span className="block text-sm font-semibold">{t(`topics.${key}.title`)}</span>
              <span className="block text-xs leading-5 text-[var(--muted)]">
                {t(`topics.${key}.description`)}
              </span>
            </span>
          </label>
        ))}
      </div>

      {state === "unsupported" && (
        <p className="text-sm text-[var(--muted)]">{t("unsupported")}</p>
      )}
      {state === "denied" && <p className="text-sm text-[var(--muted)]">{t("denied")}</p>}
      {message && <p className="text-sm text-[var(--muted)]">{message}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={save}
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
        >
          {state === "busy" ? t("busy") : state === "subscribed" ? t("save") : t("enable")}
        </button>
        {state === "subscribed" && (
          <button
            type="button"
            onClick={disable}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:border-[var(--brand)]"
          >
            {t("disable")}
          </button>
        )}
      </div>
    </section>
  );
}
