"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShareButtons } from "@/components/share-buttons";

export function LeagueInvite({ url }: { url: string }) {
  const t = useTranslations("league");
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
      <h2 className="font-bold">{t("invite")}</h2>
      <p className="text-sm text-[var(--muted)]">{t("inviteHint")}</p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 truncate rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
        >
          {copied ? t("copied") : t("copy")}
        </button>
      </div>
      <ShareButtons url={url} text={t("shareText")} compact contentType="league" />
    </div>
  );
}
