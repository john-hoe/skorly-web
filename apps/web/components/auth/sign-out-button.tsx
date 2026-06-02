"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { signOutAction } from "@/lib/auth-actions";

export function SignOutButton() {
  const t = useTranslations("account");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await signOutAction();
          router.push("/");
          router.refresh();
        })
      }
      className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--card)] disabled:opacity-60"
    >
      {t("signOut")}
    </button>
  );
}
