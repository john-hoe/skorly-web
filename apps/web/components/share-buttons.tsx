"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://skorly.cc").replace(/\/$/, "");

interface Props {
  /** Absolute or root-relative URL to share. */
  url: string;
  /** Pre-filled message text. */
  text: string;
  compact?: boolean;
}

function absolute(url: string): string {
  if (url.startsWith("http")) return url;
  return `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

export function ShareButtons({ url, text, compact = false }: Props) {
  const t = useTranslations("share");
  const [copied, setCopied] = useState(false);

  const shareUrl = absolute(url);
  const enc = encodeURIComponent;
  const msg = `${text} ${shareUrl}`;

  const targets = [
    { key: "wa", label: "WhatsApp", href: `https://wa.me/?text=${enc(msg)}` },
    {
      key: "x",
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(shareUrl)}`,
    },
    {
      key: "fb",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}`,
    },
    {
      key: "tg",
      label: "Telegram",
      href: `https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(text)}`,
    },
  ];

  async function native() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text, url: shareUrl });
      } catch {
        /* user cancelled */
      }
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
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
      <button onClick={native} className={`${pill} sm:hidden`}>
        ↗ {t("share")}
      </button>
      {targets.map((s) => (
        <a key={s.key} href={s.href} target="_blank" rel="noopener noreferrer" className={pill}>
          {s.label}
        </a>
      ))}
      <button onClick={copy} className={pill}>
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}
