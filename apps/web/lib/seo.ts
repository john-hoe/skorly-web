import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://skorly.cc"
).replace(/\/$/, "");

export const SITE_NAME = "Skorly";
export const SITE_LOGO_PATH = "/icon-512.png";

type Href = Parameters<typeof getPathname>[0]["href"];

/** hreflang code per locale (Google-friendly). */
const HREFLANG: Record<string, string> = {
  id: "id",
  vi: "vi",
  en: "en",
  zh: "zh-Hans",
};

export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path}`;
}

export const SITE_LOGO_URL = absoluteUrl(SITE_LOGO_PATH);

/** Localized path (with locale prefix) for a route in a given locale. */
export function localizedPath(href: Href, locale: string): string {
  return getPathname({ href, locale });
}

export function hreflangForLocale(locale: string): string {
  return HREFLANG[locale] ?? locale;
}

export function buildLanguageAlternates(
  href: Href,
  locales: readonly string[] = routing.locales
): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const l of locales) {
    languages[hreflangForLocale(l)] = absoluteUrl(localizedPath(href, l));
  }
  const defaultLocale = locales.includes(routing.defaultLocale)
    ? routing.defaultLocale
    : locales[0] ?? routing.defaultLocale;
  languages["x-default"] = absoluteUrl(localizedPath(href, defaultLocale));
  return languages;
}

/**
 * Build Next metadata `alternates` (canonical for current locale + hreflang
 * languages for every locale + x-default).
 */
export function buildAlternates(
  href: Href,
  locale: string,
  locales: readonly string[] = routing.locales
) {
  return {
    canonical: absoluteUrl(localizedPath(href, locale)),
    languages: buildLanguageAlternates(href, locales),
  };
}

/** Open Graph locale tag per app locale. */
export const OG_LOCALE: Record<string, string> = {
  id: "id_ID",
  vi: "vi_VN",
  en: "en_PH",
  zh: "zh_CN",
};

const DEFAULT_OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "Skorly — World Cup 2026 news, previews & predictions",
};

export function buildCanonicalMetadata(
  href: Href,
  locale: string,
  locales: readonly string[] = routing.locales
) {
  const alternates = buildAlternates(href, locale, locales);
  return {
    alternates,
    openGraph: {
      type: "website" as const,
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale] ?? "id_ID",
      url: alternates.canonical,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

function truncateAtBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, Math.max(0, maxLength - 1)).trimEnd();
  const boundary = sliced.lastIndexOf(" ");
  const shortened =
    boundary > maxLength * 0.65 ? sliced.slice(0, boundary).trimEnd() : sliced;
  return `${shortened}…`;
}

export function cleanMetaText(text: string): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_>`~|[\]{}()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function fitMetaTitle(title: string, maxLength = 52): string {
  return truncateAtBoundary(cleanMetaText(title), maxLength);
}

export function fitMetaDescription(
  text: string,
  fallback: string,
  maxLength = 140,
  leadingTextToRemove?: string
): string {
  const cleaned = removeLeadingText(cleanMetaText(text), leadingTextToRemove);
  const base =
    cleaned.length >= 50
      ? cleaned
      : cleanMetaText(`${cleaned} ${fallback}`);
  return truncateAtBoundary(base, maxLength);
}

function removeLeadingText(text: string, leadingTextToRemove?: string): string {
  const leading = leadingTextToRemove ? cleanMetaText(leadingTextToRemove) : "";
  if (!leading) return text;
  const lowerText = text.toLocaleLowerCase();
  const lowerLeading = leading.toLocaleLowerCase();
  if (!lowerText.startsWith(lowerLeading)) return text;
  return text.slice(leading.length).replace(/^[\s:—–-]+/, "").trim();
}

export function matchSeoDescription(locale: string, matchTitle: string): string {
  switch (locale) {
    case "id":
      return `${matchTitle} — preview Piala Dunia 2026, prediksi skor, detail kick-off, info tim, dan analisis pertandingan.`;
    case "vi":
      return `${matchTitle} — nhận định World Cup 2026, dự đoán tỉ số, giờ bóng lăn, thông tin đội tuyển và phân tích trận đấu.`;
    case "zh":
      return `${matchTitle} — 2026 世界杯赛前分析、比分预测、开球信息、球队动态和比赛看点。`;
    default:
      return `${matchTitle} — World Cup 2026 preview, score prediction, kickoff details, team news and match analysis.`;
  }
}

type PageSeoKind =
  | "home"
  | "worldCup"
  | "teams"
  | "team"
  | "schedule"
  | "scores"
  | "news"
  | "articles"
  | "leaderboard"
  | "bracket"
  | "stories"
  | "watch"
  | "group";

const PAGE_DESCRIPTIONS: Record<
  string,
  Record<PageSeoKind, (subject?: string) => string>
> = {
  id: {
    home: () =>
      "Berita Piala Dunia 2026, jadwal pertandingan, prediksi skor, analisis grup, dan panduan tim untuk fans Indonesia.",
    worldCup: () =>
      "Pusat Piala Dunia 2026 berisi grup, jadwal, pertandingan pilihan, prediksi skor, dan panduan cepat untuk mengikuti turnamen.",
    teams: () =>
      "Daftar semua tim Piala Dunia 2026 lengkap dengan grup, jadwal pertandingan, skuad, dan profil singkat setiap negara.",
    team: (team) =>
      `Profil ${team} di Piala Dunia 2026: skuad, jadwal pertandingan, grup, performa terkini, dan info penting tim.`,
    schedule: () =>
      "Jadwal Piala Dunia 2026 lengkap dalam waktu WIB, termasuk fase grup, tanggal pertandingan, tim, dan tautan prediksi skor.",
    scores: () =>
      "Skor langsung Piala Dunia 2026, hasil pertandingan, status laga, dan pembaruan menit demi menit untuk semua tim.",
    news: () =>
      "Berita terbaru Piala Dunia 2026, kabar tim, jadwal, skuad, tiket, dan update penting menjelang turnamen.",
    articles: () =>
      "Kumpulan artikel Piala Dunia 2026: berita, preview pertandingan, prediksi skor, analisis grup, dan poin taktik.",
    leaderboard: () =>
      "Klasemen prediksi Skorly untuk Piala Dunia 2026, menampilkan pemain terbaik, poin, jumlah tebakan, dan skor tepat.",
    bracket: () =>
      "Buat prediksi bagan Piala Dunia 2026: pilih empat besar, finalis, juara, lalu bagikan bracket versimu.",
    stories: () =>
      "Web Stories Piala Dunia 2026 berisi preview visual singkat, jadwal pertandingan, dan ajakan tebak skor di Skorly.",
    watch: () =>
      "Panduan nonton Piala Dunia 2026 lewat broadcaster resmi dan berlisensi per wilayah, tanpa tautan streaming ilegal.",
    group: (group) =>
      `Klasemen dan jadwal Grup ${group} Piala Dunia 2026, termasuk pertandingan, posisi tim, dan tautan prediksi skor.`,
  },
  vi: {
    home: () =>
      "Tin tức World Cup 2026, lịch thi đấu, dự đoán tỉ số, phân tích bảng đấu và thông tin đội tuyển cho người hâm mộ Việt Nam.",
    worldCup: () =>
      "Trung tâm World Cup 2026 với bảng đấu, lịch thi đấu, trận nổi bật, dự đoán tỉ số và hướng dẫn nhanh cho người hâm mộ.",
    teams: () =>
      "Danh sách đội tuyển World Cup 2026 với bảng đấu, lịch thi đấu, đội hình và hồ sơ nhanh của từng quốc gia.",
    team: (team) =>
      `Hồ sơ ${team} tại World Cup 2026: đội hình, lịch thi đấu, bảng đấu, phong độ gần đây và thông tin quan trọng.`,
    schedule: () =>
      "Lịch thi đấu World Cup 2026 theo giờ Việt Nam, gồm vòng bảng, ngày thi đấu, đội tuyển và liên kết dự đoán tỉ số.",
    scores: () =>
      "Tỉ số World Cup 2026 trực tiếp, kết quả trận đấu, trạng thái thi đấu và cập nhật từng phút cho mọi đội tuyển.",
    news: () =>
      "Tin tức mới nhất về World Cup 2026, đội tuyển, lịch thi đấu, danh sách cầu thủ, vé và các cập nhật quan trọng.",
    articles: () =>
      "Tổng hợp bài viết World Cup 2026: tin tức, nhận định trận đấu, dự đoán tỉ số, phân tích bảng và điểm chiến thuật.",
    leaderboard: () =>
      "Bảng xếp hạng dự đoán Skorly cho World Cup 2026, gồm người chơi dẫn đầu, điểm số, lượt dự đoán và tỉ số chính xác.",
    bracket: () =>
      "Tạo nhánh dự đoán World Cup 2026: chọn bán kết, chung kết, nhà vô địch và chia sẻ bracket của bạn.",
    stories: () =>
      "Web Stories World Cup 2026 với preview hình ảnh ngắn, lịch trận đấu và lời mời dự đoán tỉ số trên Skorly.",
    watch: () =>
      "Hướng dẫn xem World Cup 2026 qua các đơn vị phát sóng chính thức và được cấp phép theo từng khu vực.",
    group: (group) =>
      `Bảng xếp hạng và lịch thi đấu bảng ${group} World Cup 2026, gồm trận đấu, vị trí đội tuyển và liên kết dự đoán.`,
  },
  en: {
    home: () =>
      "World Cup 2026 news, match schedule, score predictions, group analysis and team guides for football fans.",
    worldCup: () =>
      "World Cup 2026 hub with groups, fixtures, featured matches, score predictions and quick tournament guides.",
    teams: () =>
      "All World Cup 2026 teams with groups, fixtures, squad information and quick profiles for every qualified nation.",
    team: (team) =>
      `${team} World Cup 2026 profile with squad, fixtures, group, recent form and key team information.`,
    schedule: () =>
      "Complete World Cup 2026 schedule with group-stage dates, match links, teams and score prediction pages.",
    scores: () =>
      "World Cup 2026 live scores, match results, fixture status and minute-by-minute updates for every team.",
    news: () =>
      "Latest World Cup 2026 news, team updates, fixtures, squads, tickets and tournament stories from Skorly.",
    articles: () =>
      "World Cup 2026 articles covering news, match previews, score predictions, group analysis and tactical talking points.",
    leaderboard: () =>
      "Skorly World Cup 2026 prediction leaderboard with top players, points, picks played and exact-score results.",
    bracket: () =>
      "Build your World Cup 2026 bracket prediction: choose the final four, finalists, champion and share your picks.",
    stories: () =>
      "World Cup 2026 Web Stories with quick visual match previews, fixture context and score prediction prompts.",
    watch: () =>
      "Where to watch World Cup 2026 through official and licensed broadcasters by region, with no illegal stream links.",
    group: (group) =>
      `World Cup 2026 Group ${group} standings and fixtures with team positions, match schedule and prediction links.`,
  },
  zh: {
    home: () =>
      "2026 世界杯新闻、赛程、比分预测、小组分析和球队指南，面向印尼、越南及全球中文球迷持续更新，附观赛入口。",
    worldCup: () =>
      "2026 世界杯中心页，汇总小组、赛程、重点比赛、比分预测和快速观赛指南，帮助中文球迷跟进完整赛事。",
    teams: () =>
      "查看 2026 世界杯全部球队名单、小组归属、赛程、阵容信息和每支国家队的快速资料，附比赛预测入口和赛事背景。",
    team: (team) =>
      `查看 ${team} 2026 世界杯球队资料，包括阵容、赛程、小组位置、近期状态、关键比赛信息和预测入口。`,
    schedule: () =>
      "查看 2026 世界杯完整赛程，包含小组赛日期、参赛球队、比赛链接、开球时间、赛前信息和比分预测入口。",
    scores: () =>
      "查看 2026 世界杯实时比分、比赛结果、进行状态和分钟级更新，快速跟进每场比赛的关键变化和赛果摘要。",
    news: () =>
      "获取 2026 世界杯最新新闻、球队动态、赛程变化、阵容名单、票务消息和赛事重点更新，快速跟进赛前信息。",
    articles: () =>
      "浏览 2026 世界杯文章合集，包括新闻、比赛前瞻、比分预测、小组分析、战术看点、球队深度解读和赛前背景。",
    leaderboard: () =>
      "查看 Skorly 2026 世界杯预测排行榜，包含玩家积分、已预测场次、精准比分表现和竞猜排名变化。",
    bracket: () =>
      "创建你的 2026 世界杯晋级图预测，选择四强、决赛球队、冠军，并分享你的 bracket 和夺冠路线。",
    stories: () =>
      "浏览 2026 世界杯 Web Stories，用图文快速了解比赛前瞻、赛程背景、球队状态和比分预测提示。",
    watch: () =>
      "查看 2026 世界杯各地区官方及授权转播方指南，只提供合法观看渠道，帮助球迷避开盗播链接和不可靠来源。",
    group: (group) =>
      `查看 2026 世界杯 ${group} 组积分榜和赛程，包括球队排名、比赛安排、出线形势、关键赛程和比分预测入口。`,
  },
};

export function pageSeoDescription(
  locale: string,
  kind: PageSeoKind,
  subject?: string
): string {
  return (PAGE_DESCRIPTIONS[locale] ?? PAGE_DESCRIPTIONS.id)[kind](subject);
}

const PAGE_TITLES: Record<
  string,
  Partial<Record<PageSeoKind, (subject?: string) => string>>
> = {
  id: {
    home: () => "Piala Dunia 2026: Jadwal & Prediksi",
    worldCup: () => "Pusat Piala Dunia 2026",
    scores: () => "Skor Piala Dunia 2026: Live & Hasil",
  },
  vi: {
    home: () => "World Cup 2026: Lịch thi đấu & Dự đoán",
    worldCup: () => "Trung tâm World Cup 2026",
    scores: () => "Tỉ số World Cup 2026: Trực tiếp & Kết quả",
  },
  en: {
    home: () => "World Cup 2026: Schedule & Predictions",
    worldCup: () => "World Cup 2026 Hub",
    scores: () => "World Cup 2026 Live Scores & Results",
  },
  zh: {
    home: () => "2026 世界杯赛程、比分预测与球队指南",
    worldCup: () => "2026 世界杯赛事中心",
    scores: () => "2026 世界杯实时比分与赛果",
  },
};

export function pageSeoTitle(
  locale: string,
  kind: PageSeoKind,
  subject?: string
): string {
  const localized = PAGE_TITLES[locale]?.[kind];
  const fallback = PAGE_TITLES.id[kind];
  return (localized ?? fallback)?.(subject) ?? SITE_NAME;
}
