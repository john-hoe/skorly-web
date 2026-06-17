"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { signInAction, type ActionResult } from "@/lib/auth-actions";
import { track } from "@/lib/analytics";
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

export function LoginForm({
  locale,
  initialError,
  nextPath,
}: {
  locale: string;
  initialError?: string;
  nextPath?: string | null;
}) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    async (_prev, fd) => signInAction(fd),
    initialError ? { ok: false, error: initialError } : null,
  );

  useEffect(() => {
    if (state?.ok) {
      track("auth_completed", { method: "email", source: "login_form" });
      if (nextPath) {
        window.location.assign(nextPath);
        return;
      }
      router.push("/akun");
      router.refresh();
    }
  }, [state, router, nextPath]);

  const errMsg =
    state && !state.ok && state.error
      ? KNOWN.has(state.error)
        ? t(`errors.${state.error}`)
        : state.error
      : null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold">{t("login.title")}</h1>
        <p className="text-sm text-[var(--muted)] mt-1">{t("login.subtitle")}</p>
      </div>
      <form
        action={action}
        onSubmit={() => track("auth_started", { method: "email", source: "login_form" })}
        className="space-y-3"
      >
        <input type="hidden" name="locale" value={locale} />
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("login.email")}</span>
          <input type="email" name="email" required autoComplete="email" className={FIELD} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("login.password")}</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className={FIELD}
          />
        </label>
        <Turnstile />
        {errMsg && <p className="text-sm text-red-500">{errMsg}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
        >
          {t("login.submit")}
        </button>
      </form>
      <OAuthButtons locale={locale} nextPath={nextPath} />
      <div className="flex items-center justify-between text-sm">
        <Link href="/lupa-sandi" className="text-[var(--muted)] hover:text-[var(--brand)]">
          {t("login.forgot")}
        </Link>
        <span className="text-[var(--muted)]">
          {t("login.noAccount")}{" "}
          <Link href="/daftar" className="font-semibold text-[var(--brand)] hover:underline">
            {t("login.signUp")}
          </Link>
        </span>
      </div>
    </div>
  );
}
