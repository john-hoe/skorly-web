# SEO Strategy

## Domain & i18n
- Single domain `skorly.cc`, locale subpaths `/id`, `/vi`, `/en` (next-intl, localized pathnames).
- hreflang per locale; `en` targets `en-PH` to avoid losing PH traffic to global EN sites.
- Localized slugs per market: `/id/pertandingan/...`, `/vi/tran-dau/...`, `/en/match/...`.

## Must-ship (Phase 0 Day 12)
- `sitemap.xml` (per-locale, per-section)
- `news-sitemap.xml` (Google News; refreshed every ~5 min by Worker)
- Schema.org `SportsEvent` (matches) + `NewsArticle` (articles)
- Open Graph + Twitter cards
- canonical + hreflang tags
- robots.txt

## Target keywords (from competitor reverse-engineering)
- ID: `jadwal piala dunia 2026`, `klasemen piala dunia`, `prediksi <team> vs <team>`, `hasil piala dunia`
- VI: `lịch thi đấu world cup 2026`, `tỷ số`, `kết quả bóng đá hôm nay`
- EN-PH: `world cup 2026 schedule philippines time`, `fifa rankings`

## Content quality for ranking
- Gate only publishes >=8/10 articles.
- Each piece gets an Indonesian local angle, internal links, author field.
- Control daily publish volume to avoid "content farm" signals (Helpful Content Update).
