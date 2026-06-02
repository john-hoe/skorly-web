import type { Locale } from "@skorly/types";

export interface LocaleMeta {
  /** English name for LLM prompts */
  englishName: string;
  /** Short label for UI switcher */
  label: string;
  /** BCP 47 tag for `<html lang>` */
  htmlLang: string;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  id: { englishName: "Indonesian", label: "ID", htmlLang: "id" },
  vi: { englishName: "Vietnamese", label: "VI", htmlLang: "vi" },
  en: { englishName: "English", label: "EN", htmlLang: "en" },
  zh: { englishName: "Chinese (Simplified)", label: "中文", htmlLang: "zh-Hans" },
};

export function localeEnglishName(locale: string): string {
  return LOCALE_META[locale as Locale]?.englishName ?? "Indonesian";
}
