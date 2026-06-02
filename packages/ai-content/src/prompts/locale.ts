import type { Locale } from "@skorly/types";
import { localeEnglishName } from "../locale-meta";
import type { PromptResult } from "./types";

/** Wrap an Indonesian-base prompt so generation targets another locale. */
export function localizePrompt(prompt: PromptResult, locale: Locale | string): PromptResult {
  if (locale === "id") return prompt;

  const lang = localeEnglishName(locale);
  return {
    system: `You are a senior ${lang} football journalist. Write entirely in ${lang} with native fluency and correct football terminology. Never invent statistics. Keep official team and player names unchanged.\n\n${prompt.system}`,
    user: `Respond in ${lang} only.\n\n${prompt.user}`,
  };
}
