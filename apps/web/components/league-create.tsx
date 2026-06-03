"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createLeagueApi } from "@/lib/runtime-api-client";

export function LeagueCreate() {
  const t = useTranslations("league");
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createLeagueApi(name);
      if (res.ok) {
        router.push({ pathname: "/liga/[slug]", params: { slug: res.slug } });
      } else {
        setError(t(`errors.${res.error}` as never));
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("namePlaceholder")}
        maxLength={60}
        required
        className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending || name.trim().length < 2}
        className="rounded-lg bg-[var(--brand)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {pending ? t("creating") : t("create")}
      </button>
      {error && <p className="text-sm text-red-500 sm:self-center">{error}</p>}
    </form>
  );
}
