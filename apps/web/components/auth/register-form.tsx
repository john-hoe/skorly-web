"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { signUpAction, type ActionResult } from "@/lib/auth-actions";
import { Turnstile } from "./turnstile";
import { OAuthButtons } from "./oauth-buttons";

const FIELD =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm";
const KNOWN = new Set([
  "invalidEmail",
  "weakPassword",
  "invalidCredentials",
  "captcha",
  "rateLimited",
  "unauthorized",
  "generic",
  "auth",
]);

export function RegisterForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    async (_prev, fd) => signUpAction(fd),
    null,
  );

  if (state?.ok) {
    return (
      <div className="rounded-xl border border-[var(--brand)] bg-[var(--card)] p-6 text-center space-y-2">
        <h1 className="text-xl font-bold text-[var(--brand)]">{t("register.title")}</h1>
        <p className="text-sm">{t("register.checkEmail")}</p>
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
        <h1 className="text-xl font-bold">{t("register.title")}</h1>
        <p className="text-sm text-[var(--muted)] mt-1">{t("register.subtitle")}</p>
      </div>
      <form action={action} className="space-y-3">
        <input type="hidden" name="locale" value={locale} />
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("register.displayName")}</span>
          <input type="text" name="displayName" autoComplete="nickname" className={FIELD} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("register.email")}</span>
          <input type="email" name="email" required autoComplete="email" className={FIELD} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("register.password")}</span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={FIELD}
          />
          <span className="text-xs text-[var(--muted)]">{t("register.passwordHint")}</span>
        </label>
        <label className="flex items-start gap-2 text-xs text-[var(--muted)]">
          <input type="checkbox" name="consent" className="mt-0.5" />
          <span>{t("register.consent")}</span>
        </label>
        <Turnstile />
        {errMsg && <p className="text-sm text-red-500">{errMsg}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
        >
          {t("register.submit")}
        </button>
      </form>
      <OAuthButtons locale={locale} />
      <p className="text-sm text-center text-[var(--muted)]">
        {t("register.haveAccount")}{" "}
        <Link href="/masuk" className="font-semibold text-[var(--brand)] hover:underline">
          {t("register.signIn")}
        </Link>
      </p>
    </div>
  );
}
