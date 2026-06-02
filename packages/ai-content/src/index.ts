export * from "./llm-client";
export * from "./prompts";
export * from "./quality";
export { generateArticle } from "./generator";
export type { GenerateOptions, GeneratedArticle } from "./generator";
export { extractFactSheet } from "./news/factsheet";
export type { FactSheet, SignalLead } from "./news/factsheet";
export { translateArticle } from "./translate";
export {
  buildPrematchPoster,
  buildResultCard,
  type PosterVariant,
  type TeamIdentityInput,
} from "./poster-prompt";
