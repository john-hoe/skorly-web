import type { Locale } from "@/i18n/routing";

type KickoffLocale = Locale;
type KickoffStyle = "detail" | "compact";

const FALLBACK_LOCALE: KickoffLocale = "id";

const LOCALE_CONFIG: Record<
  KickoffLocale,
  {
    intlLocale: string;
    timeZone: string;
  }
> = {
  id: { intlLocale: "id-ID", timeZone: "Asia/Jakarta" },
  vi: { intlLocale: "vi-VN", timeZone: "Asia/Ho_Chi_Minh" },
  en: { intlLocale: "en-US", timeZone: "America/New_York" },
  zh: { intlLocale: "zh-CN", timeZone: "Asia/Shanghai" },
  th: { intlLocale: "th-TH", timeZone: "Asia/Bangkok" },
};

function normalizeLocale(locale: string): KickoffLocale {
  return locale === "id" || locale === "vi" || locale === "en" || locale === "zh" || locale === "th"
    ? locale
    : FALLBACK_LOCALE;
}

function partMap(
  d: Date,
  locale: KickoffLocale,
  options: Intl.DateTimeFormatOptions
): Map<Intl.DateTimeFormatPartTypes, string> {
  const config = LOCALE_CONFIG[locale];
  return new Map(
    new Intl.DateTimeFormat(config.intlLocale, {
      timeZone: config.timeZone,
      ...options,
    }).formatToParts(d).map((part) => [part.type, part.value])
  );
}

function formatVietnameseDetail(d: Date): string {
  const parts = partMap(d, "vi", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `lúc ${parts.get("hour")}:${parts.get("minute")} ${parts.get("weekday")}, ${parts.get(
    "day"
  )} ${parts.get("month")} ICT`;
}

function formatVietnameseCompact(d: Date): string {
  const parts = partMap(d, "vi", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${parts.get("day")} ${parts.get("month")}, ${parts.get("hour")}:${parts.get(
    "minute"
  )} ICT`;
}

export function formatKickoffTime(
  d: Date | null,
  locale: string,
  style: KickoffStyle = "detail"
): string {
  if (!d) return "TBD";

  const normalizedLocale = normalizeLocale(locale);
  if (normalizedLocale === "vi") {
    return style === "detail" ? formatVietnameseDetail(d) : formatVietnameseCompact(d);
  }

  const config = LOCALE_CONFIG[normalizedLocale];
  const options: Intl.DateTimeFormatOptions =
    style === "detail"
      ? {
          timeZone: config.timeZone,
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short",
        }
      : {
          timeZone: config.timeZone,
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short",
        };

  return new Intl.DateTimeFormat(config.intlLocale, options).format(d);
}

export function kickoffDayKey(d: Date | null, locale: string): string {
  if (!d) return "TBD";
  const normalizedLocale = normalizeLocale(locale);
  const parts = partMap(d, normalizedLocale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}`;
}

export function formatKickoffDay(d: Date | null, locale: string): string {
  if (!d) return "TBD";
  const normalizedLocale = normalizeLocale(locale);
  const config = LOCALE_CONFIG[normalizedLocale];
  return new Intl.DateTimeFormat(config.intlLocale, {
    timeZone: config.timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}
