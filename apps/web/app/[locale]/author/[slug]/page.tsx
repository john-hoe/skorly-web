import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import {
  ARTICLE_AUTHOR_NAME,
  ARTICLE_AUTHOR_SLUG,
  articleAuthorPath,
  articleAuthorUrl,
} from "@/lib/article-author";
import { JsonLd } from "@/components/json-ld";
import {
  SITE_NAME,
  absoluteUrl,
  buildCanonicalMetadata,
  localizedPath,
} from "@/lib/seo";

const AUTHOR_HREF = {
  pathname: "/author/[slug]",
  params: { slug: ARTICLE_AUTHOR_SLUG },
} as const;

export const dynamicParams = false;

const COPY: Record<
  Locale,
  {
    eyebrow: string;
    role: string;
    bio: (name: string) => string;
    focusTitle: string;
    focus: string[];
  }
> = {
  id: {
    eyebrow: "Penulis",
    role: "Editor sepak bola di Skorly",
    bio: (name) =>
      `${name} meliput berita Piala Dunia 2026, preview pertandingan, konteks jadwal, dan penjelasan prediksi untuk Skorly.`,
    focusTitle: "Fokus liputan",
    focus: [
      "Preview pertandingan Piala Dunia 2026",
      "Berita tim dan konteks jadwal",
      "Penjelasan prediksi dan catatan data",
    ],
  },
  vi: {
    eyebrow: "Tác giả",
    role: "Biên tập viên bóng đá tại Skorly",
    bio: (name) =>
      `${name} phụ trách tin tức World Cup 2026, nhận định trận đấu, bối cảnh lịch thi đấu và giải thích dự đoán cho Skorly.`,
    focusTitle: "Trọng tâm nội dung",
    focus: [
      "Nhận định trận đấu World Cup 2026",
      "Tin đội tuyển và bối cảnh lịch thi đấu",
      "Giải thích dự đoán và ghi chú dữ liệu",
    ],
  },
  en: {
    eyebrow: "Author",
    role: "Football editor at Skorly",
    bio: (name) =>
      `${name} covers World Cup 2026 news, match previews, fixture context, and prediction explainers for Skorly.`,
    focusTitle: "Coverage focus",
    focus: [
      "World Cup 2026 match previews",
      "Team news and fixture context",
      "Prediction explainers and data notes",
    ],
  },
  zh: {
    eyebrow: "作者",
    role: "Skorly 足球编辑",
    bio: (name) =>
      `${name} 为 Skorly 撰写 2026 世界杯新闻、赛前预览、赛程背景和预测解读。`,
    focusTitle: "报道重点",
    focus: [
      "2026 世界杯赛前预览",
      "球队动态和赛程背景",
      "预测解读和数据说明",
    ],
  },
};

function localeCopy(locale: string) {
  const safeLocale = routing.locales.includes(locale as Locale)
    ? (locale as Locale)
    : routing.defaultLocale;
  return COPY[safeLocale];
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({
    locale,
    slug: ARTICLE_AUTHOR_SLUG,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (slug !== ARTICLE_AUTHOR_SLUG) return { title: "Author" };

  const copy = localeCopy(locale);
  const bio = copy.bio(ARTICLE_AUTHOR_NAME);
  const canonicalMetadata = buildCanonicalMetadata(AUTHOR_HREF, locale);
  return {
    title: `${ARTICLE_AUTHOR_NAME} | ${SITE_NAME}`,
    description: bio,
    ...canonicalMetadata,
    openGraph: {
      ...canonicalMetadata.openGraph,
      title: `${ARTICLE_AUTHOR_NAME} | ${SITE_NAME}`,
      description: bio,
      url: absoluteUrl(articleAuthorPath(locale)),
    },
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (slug !== ARTICLE_AUTHOR_SLUG) notFound();
  setRequestLocale(locale);

  const copy = localeCopy(locale);
  const bio = copy.bio(ARTICLE_AUTHOR_NAME);
  const url = articleAuthorUrl(locale);
  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: ARTICLE_AUTHOR_NAME,
    url,
    jobTitle: copy.role,
    description: bio,
    worksFor: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl(localizedPath("/", locale)),
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <JsonLd data={personLd} />
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--brand)]">
        {copy.eyebrow}
      </p>
      <h1 className="text-3xl font-bold leading-tight">{ARTICLE_AUTHOR_NAME}</h1>
      <p className="mt-2 text-lg text-[var(--muted)]">{copy.role}</p>
      <p className="mt-6 leading-7">{bio}</p>

      <section className="mt-8 border-t border-[var(--border)] pt-6">
        <h2 className="text-base font-semibold">{copy.focusTitle}</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[var(--muted)]">
          {copy.focus.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
