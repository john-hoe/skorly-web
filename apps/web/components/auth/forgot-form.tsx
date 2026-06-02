"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { forgotPasswordAction, type ActionResult } from "@/lib/auth-actions";
import { Turnstile } from "./turnstile";

const FIELD =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm";
const KNOWN = new Set(["invalidEmail", "captcha", "rateLimited", "generic", "auth"]);

export function ForgotForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    async (_prev, fd) => forgotPasswordAction(fd),
    null,
  );

  if (state?.ok) {
    return (
      <div className="rounded-xl border border-[var(--brand)] bg-[var(--card)] p-6 text-center space-y-2">
        <h1 className="text-xl font-bold text-[var(--brand)]">{t("forgot.title")}</h1>
        <p className="text-sm">{t("forgot.resetSent")}</p>
        <Link href="/masuk" className="inline-block text-sm font-semibold text-[var(--brand)] hover:underline">
          {t("forgot.backToLogin")}
        </Link>
      </div>
    );
  }

  const errMsg =
    state && !state.ok && state.error
      ? KNOWN.has(state.error)
        ? t(`errors.${state.error}`)
        : state.error
      : null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold">{t("forgot.title")}</h1>
        <p className="text-sm text-[var(--muted)] mt-1">{t("forgot.subtitle")}</p>
      </div>
      <form action={action} className="space-y-3">
        <input type="hidden" name="locale" value={locale} />
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("forgot.email")}</span>
          <input type="email" name="email" required autoComplete="email" className={FIELD} />
        </label>
        <Turnstile />
        {errMsg && <p className="text-sm text-red-500">{errMsg}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
        >
          {t("forgot.submit")}
        </button>
      </form>
      <Link href="/masuk" className="block text-center text-sm text-[var(--muted)] hover:text-[var(--brand)]">
        {t("forgot.backToLogin")}
      </Link>
    </div>
  );
}
