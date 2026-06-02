"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { joinLeague } from "@/lib/league-actions";

interface Props {
  slug: string;
  authed: boolean;
}

export function LeagueJoin({ slug, authed }: Props) {
  const t = useTranslations("league");
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!authed) {
    return (
      <Link
        href="/masuk"
        className="inline-block rounded-lg bg-[var(--brand)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
      >
        {t("login")}
      </Link>
    );
  }

  function join() {
    setMsg(null);
    startTransition(async () => {
      const res = await joinLeague(slug);
      if (res.ok) {
        setMsg(res.alreadyMember ? t("alreadyMember") : t("joined"));
        router.refresh();
      } else {
        setMsg(t(`errors.${res.error}` as never));
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={join}
        disabled={pending}
        className="rounded-lg bg-[var(--brand)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {pending ? t("joining") : t("join")}
      </button>
      {msg && <p className="text-sm text-[var(--brand)]">{msg}</p>}
    </div>
  );
}
