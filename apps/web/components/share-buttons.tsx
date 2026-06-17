"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { track, type ShareContentType } from "@/lib/analytics";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://skorly.cc").replace(/\/$/, "");

interface Props {
  /** Absolute or root-relative URL to share. */
  url: string;
  /** Pre-filled message text. */
  text: string;
  compact?: boolean;
  contentType?: ShareContentType;
  contentId?: string;
}

function absolute(url: string): string {
  if (url.startsWith("http")) return url;
  return `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function inferContent(shareUrl: string): { contentType: ShareContentType; contentId: string } {
  try {
    const parsed = new URL(shareUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const articleIndex = parts.findIndex((part) =>
      ["artikel", "bai-viet", "article", "wenzhang", "บทความ"].includes(part),
    );
    if (articleIndex >= 0 && parts[articleIndex + 1]) {
      return { contentType: "article", contentId: parts[articleIndex + 1]! };
    }
    const matchIndex = parts.findIndex((part) =>
      ["pertandingan", "tran-dau", "match", "bisai", "การแข่งขัน"].includes(part),
    );
    if (matchIndex >= 0 && parts[matchIndex + 1]) {
      return { contentType: "prediction", contentId: parts[matchIndex + 1]! };
    }
    const leagueIndex = parts.indexOf("liga");
    if (leagueIndex >= 0 && parts[leagueIndex + 1]) {
      return { contentType: "league", contentId: parts[leagueIndex + 1]! };
    }
    return { contentType: "page", contentId: parsed.pathname || shareUrl };
  } catch {
    return { contentType: "page", contentId: shareUrl };
  }
}

export function ShareButtons({
  url,
  text,
  compact = false,
  contentType,
  contentId,
}: Props) {
  const t = useTranslations("share");
  const [copied, setCopied] = useState(false);

  const shareUrl = absolute(url);
  const inferred = inferContent(shareUrl);
  const trackedContentType = contentType ?? inferred.contentType;
  const trackedContentId = contentId ?? inferred.contentId;
  const enc = encodeURIComponent;
  const msg = `${text} ${shareUrl}`;

  const targets = [
    { key: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${enc(msg)}` },
    {
      key: "x",
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(shareUrl)}`,
    },
    {
      key: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}`,
    },
    {
      key: "telegram",
      label: "Telegram",
      href: `https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(text)}`,
    },
  ];

  function trackShare(channel: string) {
    track("share_click", {
      channel,
      contentType: trackedContentType,
      contentId: trackedContentId,
    });
  }

  async function native() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text, url: shareUrl });
        trackShare("native");
      } catch {
        /* user cancelled */
      }
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      trackShare("copy");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  const pill =
    "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-2 text-xs font-medium transition hover:border-[var(--brand)] hover:text-[var(--brand)]";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!compact && <span className="text-xs text-[var(--muted)]">{t("label")}</span>}
      <button type="button" onClick={native} className={`${pill} sm:hidden`}>
        ↗ {t("share")}
      </button>
      {targets.map((s) => (
        <a
          key={s.key}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          className={pill}
          onClick={() => trackShare(s.key)}
        >
          {s.label}
        </a>
      ))}
      <button type="button" onClick={copy} className={pill}>
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}
