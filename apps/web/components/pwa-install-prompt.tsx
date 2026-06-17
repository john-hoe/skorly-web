"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/analytics";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "skorly.pwaInstall.dismissedAt";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 9000;

function dismissedRecently(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && Date.now() - at < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function rememberDismissal(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore blocked storage */
  }
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function platform(): "ios" | "android" | "desktop" | "unknown" {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/macintosh|windows|linux/.test(ua)) return "desktop";
  return "unknown";
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) && /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
}

export function PwaInstallPrompt() {
  const t = useTranslations("pwaInstall");
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || isStandalone() || dismissedRecently()) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const currentPlatform = platform();

    const showPrompt = (event?: BeforeInstallPromptEvent) => {
      timer = setTimeout(() => {
        if (event) setPromptEvent(event);
        setIosHint(!event && isIosSafari());
        setVisible(true);
        track("pwa_install_prompt_shown", {
          platform: currentPlatform,
          source: event ? "beforeinstallprompt" : "ios_hint",
        });
      }, SHOW_DELAY_MS);
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      showPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (isIosSafari()) {
      showPrompt();
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  async function install() {
    if (!promptEvent) return;

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        track("pwa_install_accepted", { platform: platform() });
        setVisible(false);
        return;
      }
      track("pwa_install_dismissed", { platform: platform(), reason: "browser" });
      rememberDismissal();
      setVisible(false);
    } catch {
      rememberDismissal();
      setVisible(false);
    }
  }

  function dismiss() {
    track("pwa_install_dismissed", { platform: platform(), reason: "manual" });
    rememberDismissal();
    setVisible(false);
  }

  return (
    <aside
      className="fixed inset-x-4 bottom-[5.25rem] z-50 mx-auto max-w-sm rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 shadow-xl lg:bottom-4 lg:right-4 lg:left-auto"
      role="dialog"
      aria-label={iosHint ? t("iosTitle") : t("title")}
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-bold">{iosHint ? t("iosTitle") : t("title")}</h2>
          <p className="text-sm leading-5 text-[var(--muted)]">
            {iosHint ? t("iosBody") : t("body")}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--card)]"
          >
            {t("notNow")}
          </button>
          {promptEvent && (
            <button
              type="button"
              onClick={install}
              className="rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
            >
              {t("install")}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
