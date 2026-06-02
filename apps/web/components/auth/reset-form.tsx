"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { resetPasswordAction, type ActionResult } from "@/lib/auth-actions";

const FIELD =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm";
const KNOWN = new Set(["weakPassword", "generic", "auth", "unauthorized"]);

export function ResetForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    async (_prev, fd) => resetPasswordAction(fd),
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      const id = setTimeout(() => {
        router.push("/akun");
        router.refresh();
      }, 1500);
      return () => clearTimeout(id);
    }
  }, [state, router]);

  if (state?.ok) {
    return (
      <div className="rounded-xl border border-[var(--brand)] bg-[var(--card)] p-6 text-center space-y-2">
        <h1 className="text-xl font-bold text-[var(--brand)]">{t("reset.title")}</h1>
        <p className="text-sm">{t("reset.passwordUpdated")}</p>
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
        <h1 className="text-xl font-bold">{t("reset.title")}</h1>
        <p className="text-sm text-[var(--muted)] mt-1">{t("reset.subtitle")}</p>
      </div>
      <form action={action} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("reset.password")}</span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={FIELD}
          />
        </label>
        {errMsg && <p className="text-sm text-red-500">{errMsg}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
        >
          {t("reset.submit")}
        </button>
      </form>
    </div>
  );
}
