"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Status = "idle" | "loading" | "success" | "error";

/**
 * Lead-capture card: email + optional WhatsApp + marketing consent.
 * Posts to /api/subscribe (implemented in Phase 0 Day 11). Consent box is
 * unchecked by default to comply with Indonesia UU PDP.
 */
export function SubscribeGiftCard({ source = "unknown" }: { source?: string }) {
  const t = useTranslations("subscribe");
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          whatsapp: form.get("whatsapp"),
          consent: form.get("consent") === "on",
          source,
        }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-[var(--brand)] bg-[var(--card)] p-6 text-center">
        <p className="font-semibold text-[var(--brand)]">{t("success")}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-3"
    >
      <h3 className="font-bold text-lg">{t("title")}</h3>
      <p className="text-sm text-[var(--muted)]">{t("description")}</p>
      <input
        type="email"
        name="email"
        required
        placeholder={t("emailPlaceholder")}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
      />
      <input
        type="tel"
        name="whatsapp"
        placeholder={t("whatsappPlaceholder")}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
      />
      <label className="flex items-start gap-2 text-xs text-[var(--muted)]">
        <input type="checkbox" name="consent" required className="mt-0.5" />
        <span>{t("consent")}</span>
      </label>
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {t("submit")}
      </button>
      {status === "error" && (
        <p className="text-xs text-red-500">{t("error")}</p>
      )}
    </form>
  );
}
