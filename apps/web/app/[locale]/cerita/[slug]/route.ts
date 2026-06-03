import { getFixtureBySlug, getArticlesForFixture, getAllFixtures } from "@skorly/db";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SITE_NAME, absoluteUrl, buildAlternates, localizedPath } from "@/lib/seo";

type Fixture = Awaited<ReturnType<typeof getFixtureBySlug>>;
type FixtureList = Awaited<ReturnType<typeof getAllFixtures>>;
type FixtureArticles = Awaited<ReturnType<typeof getArticlesForFixture>>;

let allFixturesPromise: Promise<FixtureList> | undefined;
const fixtureCache = new Map<string, Promise<Fixture>>();
const fixtureArticlesCache = new Map<string, Promise<FixtureArticles>>();

function getAllFixturesForBuild(): Promise<FixtureList> {
  allFixturesPromise ??= getAllFixtures().catch(() => []);
  return allFixturesPromise;
}

function getFixtureForStory(slug: string): Promise<Fixture> {
  let cached = fixtureCache.get(slug);
  if (!cached) {
    cached = getFixtureBySlug(slug).catch(() => null);
    fixtureCache.set(slug, cached);
  }
  return cached;
}

function getFixtureArticlesForStory(
  fixtureId: number,
  locale: string
): Promise<FixtureArticles> {
  const key = `${locale}:${fixtureId}`;
  let cached = fixtureArticlesCache.get(key);
  if (!cached) {
    cached = getArticlesForFixture(fixtureId, locale).catch(() => []);
    fixtureArticlesCache.set(key, cached);
  }
  return cached;
}

// Fully static for SEO and OpenNext/Cloudflare stability. Fixture/article reads
// are cached during build so AMP story generation does not repeat DB work.
export const dynamicParams = false;

export async function generateStaticParams() {
  const fixtures = await getAllFixturesForBuild();
  return routing.locales.flatMap((locale) =>
    fixtures.map((f) => ({ locale, slug: f.slug }))
  );
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function kickoff(d: Date | null): string {
  if (!d) return "TBD";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

const AMP_BOILERPLATE =
  '<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ locale: string; slug: string }> }
) {
  const { locale, slug } = await params;
  const fixture = await getFixtureForStory(slug);
  if (!fixture) {
    return new Response("Not found", { status: 404 });
  }

  const t = await getTranslations({ locale });
  const articles = await getFixtureArticlesForStory(fixture.id, locale);
  const byType = new Map(articles.map((a) => [a.type, a]));
  const prediction = byType.get("prediction") ?? byType.get("preview");
  const blurb =
    prediction?.summary ??
    prediction?.body.replace(/[#*_>`]/g, "").slice(0, 220).trim() ??
    `${fixture.home.name} vs ${fixture.away.name} — ${t("nav.worldCup")} 2026.`;

  const title = `${fixture.home.name} vs ${fixture.away.name}`;
  const alternates = buildAlternates(
    { pathname: "/cerita/[slug]", params: { slug } },
    locale
  );
  const alternateLinks = Object.entries(alternates.languages)
    .map(
      ([hreflang, href]) =>
        `<link rel="alternate" hreflang="${esc(hreflang)}" href="${esc(href)}">`
    )
    .join("\n");
  const matchUrl = absoluteUrl(
    localizedPath({ pathname: "/pertandingan/[slug]", params: { slug } }, locale)
  );
  const poster = absoluteUrl("/og.png");
  const homeLogo = fixture.home.logo ? esc(fixture.home.logo) : "";
  const awayLogo = fixture.away.logo ? esc(fixture.away.logo) : "";
  const eventLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: title,
    sport: "Soccer",
    ...(fixture.kickoffAt ? { startDate: fixture.kickoffAt.toISOString() } : {}),
    ...(fixture.venue
      ? {
          location: {
            "@type": "Place",
            name: fixture.venue,
            address: fixture.city ?? undefined,
          },
        }
      : {}),
    competitor: [
      { "@type": "SportsTeam", name: fixture.home.name },
      { "@type": "SportsTeam", name: fixture.away.name },
    ],
    superEvent: { "@type": "SportsEvent", name: "FIFA World Cup 2026" },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: SITE_NAME,
        item: absoluteUrl(localizedPath("/", locale)),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: t("stories.title"),
        item: absoluteUrl(localizedPath("/cerita", locale)),
      },
      { "@type": "ListItem", position: 3, name: title },
    ],
  };

  const html = `<!doctype html>
<html ⚡ lang="${esc(locale)}">
<head>
<meta charset="utf-8">
<title>${esc(title)} — ${esc(SITE_NAME)}</title>
<link rel="canonical" href="${esc(alternates.canonical)}">
${alternateLinks}
<meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
<meta name="description" content="${esc(blurb).slice(0, 160)}">
<script type="application/ld+json">${jsonLd([eventLd, breadcrumbLd])}</script>
<script async src="https://cdn.ampproject.org/v0.js"></script>
<script async custom-element="amp-story" src="https://cdn.ampproject.org/v0/amp-story-1.0.js"></script>
${AMP_BOILERPLATE}
<style amp-custom>
amp-story{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.bg{background:linear-gradient(135deg,#0f8a4f 0%,#0a5e36 100%)}
.wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#fff;text-align:center;padding:32px}
.kicker{font-size:14px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;margin-bottom:8px}
.title{font-size:30px;font-weight:800;line-height:1.15;margin:0}
.vs{font-size:22px;font-weight:700;margin:16px 0}
.logos{display:flex;align-items:center;gap:20px;margin:24px 0}
.logos amp-img{background:#fff;border-radius:50%;padding:8px}
.blurb{font-size:19px;line-height:1.45;max-width:80%}
.meta{font-size:15px;opacity:.85;margin-top:16px}
.cta{display:inline-block;margin-top:24px;background:#fff;color:#0a5e36;font-weight:700;padding:12px 22px;border-radius:999px;text-decoration:none}
</style>
</head>
<body>
<amp-story standalone
  title="${esc(title)}"
  publisher="${esc(SITE_NAME)}"
  publisher-logo-src="${esc(poster)}"
  poster-portrait-src="${esc(poster)}">

  <amp-story-page id="cover">
    <amp-story-grid-layer template="fill"><div class="bg" style="width:100%;height:100%"></div></amp-story-grid-layer>
    <amp-story-grid-layer template="vertical">
      <div class="wrap">
        <p class="kicker">${esc(t("nav.worldCup"))} 2026</p>
        <div class="logos">
          ${homeLogo ? `<amp-img src="${homeLogo}" width="72" height="72" layout="fixed" alt="${esc(fixture.home.name)}"></amp-img>` : ""}
          <span class="vs">VS</span>
          ${awayLogo ? `<amp-img src="${awayLogo}" width="72" height="72" layout="fixed" alt="${esc(fixture.away.name)}"></amp-img>` : ""}
        </div>
        <h1 class="title">${esc(title)}</h1>
        <p class="meta">${esc(kickoff(fixture.kickoffAt))} WIB${fixture.venue ? ` · ${esc(fixture.venue)}` : ""}</p>
      </div>
    </amp-story-grid-layer>
  </amp-story-page>

  <amp-story-page id="prediction">
    <amp-story-grid-layer template="fill"><div class="bg" style="width:100%;height:100%"></div></amp-story-grid-layer>
    <amp-story-grid-layer template="vertical">
      <div class="wrap">
        <p class="kicker">${esc(t("match.prediction"))}</p>
        <p class="blurb">${esc(blurb)}</p>
      </div>
    </amp-story-grid-layer>
  </amp-story-page>

  <amp-story-page id="cta">
    <amp-story-grid-layer template="fill"><div class="bg" style="width:100%;height:100%"></div></amp-story-grid-layer>
    <amp-story-grid-layer template="vertical">
      <div class="wrap">
        <h2 class="title">${esc(t("predict.title"))}</h2>
        <a class="cta" href="${esc(matchUrl)}">${esc(SITE_NAME)} →</a>
      </div>
    </amp-story-grid-layer>
  </amp-story-page>

</amp-story>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
