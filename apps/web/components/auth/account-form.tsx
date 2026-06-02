"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateProfileAction, type ActionResult } from "@/lib/auth-actions";

const FIELD =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm";

export interface TeamOption {
  id: number;
  name: string;
}

export interface AccountFormProps {
  email: string;
  displayName: string;
  whatsappNumber: string;
  favoriteTeamId: number | null;
  consentMarketing: boolean;
  teams: TeamOption[];
}

export function AccountForm({
  email,
  displayName,
  whatsappNumber,
  favoriteTeamId,
  consentMarketing,
  teams,
}: AccountFormProps) {
  const t = useTranslations("account");
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    async (_prev, fd) => updateProfileAction(fd),
    null,
  );

  return (
    <form
      action={action}
      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4"
    >
      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("email")}</span>
        <input type="email" value={email} disabled className={`${FIELD} opacity-60`} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("displayName")}</span>
        <input
          type="text"
          name="displayName"
          defaultValue={displayName}
          className={FIELD}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("whatsapp")}</span>
        <input
          type="tel"
          name="whatsappNumber"
          defaultValue={whatsappNumber}
          className={FIELD}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("favoriteTeam")}</span>
        <select
          name="favoriteTeamId"
          defaultValue={favoriteTeamId ?? ""}
          className={FIELD}
        >
          <option value="">{t("none")}</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-start gap-2 text-sm text-[var(--muted)]">
        <input
          type="checkbox"
          name="consent"
          defaultChecked={consentMarketing}
          className="mt-0.5"
        />
        <span>{t("consent")}</span>
      </label>
      {state?.ok && <p className="text-sm text-green-600">{t("saved")}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {t("save")}
      </button>
    </form>
  );
}
