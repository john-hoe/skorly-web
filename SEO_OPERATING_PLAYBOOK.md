# SEO Operating Playbook

Last updated: 2026-06-12

This playbook is the shared SEO/GSC operating baseline for this workspace. It is designed to be reused across sites and sessions. It does not replace site-specific evidence collection.

## Source Baseline

Primary source: Google Search Central documentation.

Core entry point:
- https://developers.google.com/search/docs?hl=zh_CN

Official docs to re-check for issue-specific work:
- SEO starter guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=zh_CN
- Crawling and indexing: https://developers.google.com/search/docs/crawling-indexing?hl=zh_CN
- Sitemaps: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview?hl=zh_CN
- robots.txt: https://developers.google.com/search/docs/crawling-indexing/robots/intro?hl=zh_CN
- robots meta / X-Robots-Tag: https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag?hl=zh_CN
- Canonicalization: https://developers.google.com/search/docs/crawling-indexing/canonicalization?hl=zh_CN
- rel=canonical and duplicate URLs: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=zh_CN
- JavaScript SEO: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics?hl=zh_CN
- Localized versions / hreflang: https://developers.google.com/search/docs/specialty/international/localized-versions?hl=zh_CN
- Structured data general guidelines: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data?hl=zh_CN
- Article structured data: https://developers.google.com/search/docs/appearance/structured-data/article?hl=zh_CN
- Event structured data: https://developers.google.com/search/docs/appearance/structured-data/event?hl=zh_CN
- Breadcrumb structured data: https://developers.google.com/search/docs/appearance/structured-data/breadcrumb?hl=zh_CN
- FAQ structured data: https://developers.google.com/search/docs/appearance/structured-data/faqpage?hl=zh_CN
- Web Stories: https://developers.google.com/search/docs/appearance/enable-web-stories?hl=zh_CN
- Web Story best practices: https://developers.google.com/search/docs/appearance/web-stories-creation-best-practices?hl=zh_CN
- Google Images SEO: https://developers.google.com/search/docs/appearance/google-images?hl=zh_CN
- Page experience: https://developers.google.com/search/docs/appearance/page-experience?hl=zh_CN
- Core Web Vitals: https://developers.google.com/search/docs/appearance/core-web-vitals?hl=zh_CN
- Google Discover: https://developers.google.com/search/docs/appearance/google-discover?hl=zh_CN
- Spam policies: https://developers.google.com/search/docs/essentials/spam-policies?hl=zh_CN

Rule: for any disputed finding, cite the specific Google doc page and current production evidence. Do not rely on memory or generic SEO folklore.

## First Principles

SEO diagnosis starts from four questions:

1. Can Googlebot fetch the URL?
2. Can Googlebot see the primary content and metadata in HTML?
3. Can Google understand the canonical, language, entity, and structured data signals?
4. Is the page worth indexing for a real search intent?

If a page fails question 1 or 2, rankings and rich results are downstream noise. Fix crawlability and HTML completeness before title rewrites, keyword expansion, or content optimization.

## Priority Model

Use this severity model across all sites.

P0 blocks indexability or invalidates production SEO evidence:
- 5xx, intermittent Worker/runtime failures, request hangs.
- robots.txt blocks important paths.
- noindex / X-Robots-Tag noindex on indexable pages.
- HTML is empty, loading-only, or primary content requires client-only fetch.
- canonical points to wrong URL, non-200 URL, or cross-language wrong page.
- sitemap advertises 404/5xx/redirect/noindex URLs at material scale.
- GSC live test cannot fetch representative URLs.
- hreflang points to non-200 or missing reciprocal alternates on important page families.

P1 harms discovery, rich results, or search appearance:
- sitemap stale, missing key page families, incorrect lastmod, or news sitemap older than policy window.
- structured data missing Google-required fields.
- title/description missing, duplicated at scale, wrong language, or search-intent mismatched.
- Web Story AMP invalid or missing required metadata/images.
- image assets blocked, too small, or missing meaningful alt/context for image search.
- important navigation/internal links unavailable in HTML.

P2 improves growth after technical correctness:
- content depth, uniqueness, freshness, authoritativeness.
- internal linking and hub/category architecture.
- Core Web Vitals and page experience.
- Discover readiness.
- crawl budget efficiency for large sites.
- SERP CTR improvements.

## Standard Audit Workflow

1. Confirm baseline
- Current branch and commit.
- Production build/version if available.
- Target domain, canonical host, locales, markets, and key page types.
- GSC/GA4 access status.

2. Crawl production
- Fetch robots.txt, sitemap.xml, news-sitemap.xml if present.
- Count sitemap URLs.
- Sample and/or exhaustively check URL HTTP status.
- Verify HTML contains primary content, title, description, canonical, hreflang, JSON-LD, and visible H1.

3. Check GSC
- Sitemaps report: Last read, status, discovered URLs.
- Page indexing: valid, excluded, crawled/discovered but not indexed, 404/soft 404, duplicate/canonical issues.
- URL Inspection: separate "Google index" state from "Live test" state.
- Enhancements: structured data, AMP/Web Story, breadcrumbs, FAQ, events.

4. Compare signals
- Sitemap loc vs production URL inventory.
- Sitemap alternates vs HTML hreflang.
- HTML canonical vs actual URL.
- JSON-LD url/mainEntityOfPage vs canonical.
- robots/noindex vs sitemap inclusion.

5. Classify findings
- Record only evidence-backed findings.
- Include exact URL samples, counts, reproduction command, and expected behavior.
- Avoid opening findings for known GSC processing delay when live test and production fetch both pass.

## Production Checks

Use production URLs unless the task explicitly asks for local/staging.

Minimum checks for each representative URL:
- HTTP status is 200.
- Final URL has no unwanted redirect.
- HTML contains primary content, not only a loading shell.
- `<title>` exists and is language-appropriate.
- meta description exists when page type needs search snippet control.
- canonical exists and points to the preferred 200 URL.
- hreflang alternates are complete and reciprocal for localized pages.
- JSON-LD is valid JSON and matches the page.
- Open Graph/Twitter image exists for social/search surfaces where relevant.
- Response is stable across repeated requests.

Quantitative starting thresholds:
- Core URL smoke: 0 failures in 50 URLs before deeper SEO validation.
- Sitemap full check: 0 bad URLs is the target; any 404/5xx in sitemap is a finding unless intentionally temporary and documented.
- Production 5xx: release gate should be 0 failures in a 200-request smoke sample. To claim under 0.1%, use at least thousands of requests or Cloudflare/server logs.
- Dynamic SSR SEO pages: p75 TTFB under 800 ms and p95 under 2 s is a practical target. Slower pages are not automatically non-indexable, but they increase crawl and user risk.

## Sitemap Rules

Sitemap is a discovery signal, not a guarantee of indexing.

Expected:
- Sitemap endpoint returns 200 XML.
- Only canonical, indexable, 200 URLs are included.
- `lastmod` reflects real content changes. Do not set future dates. Do not update all URLs on every build unless all pages truly changed.
- Sitemap URL count should match expected page inventory.
- robots.txt references the sitemap URLs.
- News sitemap contains only recent eligible news items and should not go stale.

GSC resubmit rule:
- Resubmit after production confirms 200 XML and meaningful fixes are deployed.
- Do not delete and re-add a sitemap unless GSC is stuck, reading failed, or the submitted URL itself changed.
- After resubmit, allow 24-72 hours for Last read and Discovered URLs to stabilize.

## URL Inspection Rules

Always distinguish:

- Google index result: what Google currently has stored.
- Live test result: what Google can fetch and render now.

Interpretation:
- "URL is not on Google" + live test eligible usually means discovery/indexing delay or quality/selection issue, not necessarily a production bug.
- "Live test cannot fetch" is a P0/P1 technical issue depending on scope.
- "Discovered but not indexed" is not automatically a bug; evaluate quality, duplication, internal links, canonical, and crawl demand.

Do not bulk-click "Request indexing" as a strategy. Use it sparingly for important fixed pages after verifying live test eligibility.

## robots and Indexing Controls

Check both crawl controls and indexing controls:

- robots.txt controls crawling.
- robots meta and X-Robots-Tag control indexing and snippets.

Common mistakes:
- Blocking a URL in robots.txt while also expecting Google to see canonical/noindex on that page.
- Advertising blocked/noindex URLs in sitemap.
- Applying noindex to localized or paginated pages by accident.
- Blocking static assets needed for rendering.

## Canonical Rules

Canonical must be self-consistent:

- Canonical URL should be absolute.
- It should return 200.
- It should not point to another language unless that is intentionally the same content.
- Sitemap should list canonical URLs, not duplicates.
- JSON-LD `url` and `mainEntityOfPage` should align with canonical where applicable.

Treat canonical as a strong hint, not a command. Conflicting signals reduce reliability.

## hreflang Rules

For localized sites:

- Every localized version should list itself and all alternate localized versions.
- Alternates should be reciprocal.
- Use valid language/region codes.
- Include `x-default` when there is a default/global page.
- hreflang URLs should return 200 and be indexable.
- HTML hreflang and sitemap hreflang should agree if both are used.

For a page family with locales `id`, `vi`, `en`, `zh-Hans`, expected alternates are usually:
- `id`
- `vi`
- `en`
- `zh-Hans`
- `x-default`

## JavaScript SEO Rules

Google can render JavaScript, but do not depend on client-only rendering for core SEO surfaces.

Preferred:
- SSG or SSR returns full primary content in HTML.
- Metadata, canonical, hreflang, and JSON-LD are present in initial HTML.
- Client islands are acceptable for user-specific interactions after core content is available.

High risk:
- HTML contains only skeleton/loading.
- Content appears only after `useEffect` fetch.
- Metadata or structured data is injected only after client hydration.
- Runtime is unstable or intermittently returns 5xx.

## Structured Data Rules

Schema.org validity is not enough. Google rich result eligibility depends on Google's required and recommended fields for each feature.

General:
- Use JSON-LD unless the codebase has a clear reason not to.
- Match structured data to visible page content.
- Do not mark up content that users cannot see.
- Use stable absolute URLs.
- Validate with Google Rich Results Test or GSC enhancement reports.

Common page types:
- Articles: Article / NewsArticle / BlogPosting, headline, image, datePublished, dateModified, author or organization where appropriate.
- Matches/events: Event or SportsEvent, name, startDate, location, image, description, performer, organizer, eventStatus where applicable.
- Breadcrumbs: BreadcrumbList matching visible hierarchy.
- FAQ: only for visible, real Q&A content; do not use for promotional blocks.
- Web Stories: AMP valid, poster/cover image, metadata, canonical, OG/Twitter image, and valid story structure.

## Content Quality Rules

Technical SEO can only expose pages; it cannot make weak pages deserve indexing.

Evaluate:
- Does the page satisfy a specific search intent better than alternatives?
- Is it unique, current, and useful?
- Is it in the correct language for the target market?
- Does it avoid thin, duplicated, auto-generated, or misleading content?
- Is there enough original analysis, context, data, or utility?

For sports/news sites:
- Freshness matters, but freshness alone is not quality.
- Match pages should have meaningful context, venue/time/team data, prediction or live value, and internal links.
- Article pages should avoid generic summaries that could be produced by any site.

## International SEO

For country/language targeting:
- Map target countries to language strategy and content intent.
- Do not assume language equals country. Indonesian content targets Indonesia; Vietnamese content targets Vietnam; English and Chinese may serve broader audiences.
- Use localized titles, descriptions, body copy, slugs where the product strategy supports it.
- Keep language switch links crawlable.
- Avoid automatic locale redirects that prevent Googlebot from discovering alternates.

## GSC Observation Windows

Use these windows before escalating:

- Sitemap resubmit: check again after 24-72 hours.
- URL Inspection live test: immediate technical signal.
- Enhancement report validation: can take days or longer.
- Page indexing: can lag significantly; do not treat same-day non-indexing as a failure if live test passes.

Escalate when:
- GSC still cannot read sitemap after 72 hours and production fetch is stable.
- Live test fails on representative URLs.
- Discovered URLs remain 0 after multiple successful reads.
- Enhancement errors persist after the deployed HTML clearly changed and GSC validation has completed.

## Evidence Template

Use this format for findings:

```md
### P0/P1/P2 - Short title

Evidence:
- URL(s):
- Count / denominator:
- Production status:
- GSC status:
- Reproduction command:
- Official Google doc:

Expected:
- What should happen.

Actual:
- What happens now.

Impact:
- Crawl/index/rich result/ranking/CTR impact.

Fix:
- Smallest safe change.

Validation:
- Commands or GSC checks to close the finding.
```

## Useful Commands

Check production build ID:

```bash
curl -sS https://example.com/BUILD_ID
```

Check sitemap status and URL count:

```bash
curl -sS -D /tmp/sitemap.headers https://example.com/sitemap.xml -o /tmp/sitemap.xml
grep -o '<loc>' /tmp/sitemap.xml | wc -l
cat /tmp/sitemap.headers
```

Check canonical, title, hreflang, and JSON-LD quickly:

```bash
node - <<'NODE'
const url = process.argv[2];
const html = await (await fetch(url)).text();
const pick = (re) => html.match(re)?.[1] || null;
console.log({
  statusUrl: url,
  title: pick(/<title[^>]*>([^<]*)<\/title>/i),
  canonical: pick(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i),
  description: pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i),
  hreflangCount: [...html.matchAll(/rel=["']alternate["'][^>]+hreflang=/gi)].length,
  jsonLdCount: [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["']/gi)].length,
});
NODE https://example.com/path
```

Check a sitemap sample:

```bash
node - <<'NODE'
const sitemap = 'https://example.com/sitemap.xml';
const xml = await (await fetch(sitemap)).text();
const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]).slice(0, 50);
let bad = 0;
for (const url of urls) {
  const res = await fetch(url, { redirect: 'manual' });
  if (res.status !== 200) {
    bad++;
    console.log(res.status, url);
  }
}
console.log({ checked: urls.length, bad });
NODE
```

## Session Handoff Rules

When handing SEO work to another session:

- Provide this playbook path.
- Provide current production build/commit.
- Provide known GSC state and latest validation timestamp.
- Provide exact page families in scope.
- State whether code changes are allowed.
- State files/branches that other sessions are touching.

The receiving session should not reread all Google docs. It should use this playbook, then open the specific official docs relevant to any finding it is about to create or fix.
