/**
 * article.type -> next-intl message key, used for both the card badge
 * (client component) and the archive filter tabs (server component).
 *
 * Kept in a plain (non-"use client") module so it can be imported by
 * Server Components: importing a non-component value from a "use client"
 * file yields a client reference (undefined on the server), which silently
 * broke the localized filter-tab labels.
 */
export const ARTICLE_TYPE_KEY: Record<string, string> = {
  preview: "match.preview",
  watchpoints: "match.watchpoints",
  prediction: "match.prediction",
  recap: "match.recap",
  tactical: "match.tactical",
  group_analysis: "common.groupAnalysis",
  news: "nav.news",
};
