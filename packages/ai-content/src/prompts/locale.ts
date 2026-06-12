import type { Locale } from "@skorly/types";
import { localeEnglishName } from "../locale-meta";
import type { PromptResult } from "./types";

/** Wrap an Indonesian-base prompt so generation targets another locale. */
export function localizePrompt(prompt: PromptResult, locale: Locale | string): PromptResult {
  if (locale === "id") return prompt;

  const lang = localeEnglishName(locale);
  // The closing reminder counters recency bias: long Indonesian-base prompts
  // (e.g. the data-grounded prediction block) otherwise pull the model back
  // into Indonesian for non-id locales. Quoted Indonesian headings (e.g.
  // `Awali dengan judul "# Prediksi: ..."`) are the strongest anchor, so the
  // wrapper explicitly orders title translation too.
  const nativeReminder =
    locale === "zh" ? "（重要：必须全文使用简体中文撰写，包括标题。不得输出印尼语或其他语言。）" : "";
  return {
    system: `You are a senior ${lang} football journalist. Write entirely in ${lang} with native fluency and correct football terminology. Never invent statistics. Keep official team and player names unchanged.\n\n${prompt.system}`,
    user: `The instructions below are written in Indonesian, but your response MUST be entirely in ${lang} — translate any requested titles or headings (e.g. "Prediksi" / "Preview") into natural ${lang} as well. Only keep official team and player names unchanged.\n\n${prompt.user}\n\nIMPORTANT: Write your entire response, including the H1 title, in ${lang} only. ${nativeReminder}`,
  };
}
