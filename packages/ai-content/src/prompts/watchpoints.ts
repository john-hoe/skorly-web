import { glossaryBlock } from "../glossary/id-football-terms";
import type { MatchContext, PromptResult } from "./types";

const SYSTEM = `Kamu editor sepak bola Indonesia. Buat poin-poin singkat, tajam, dan mudah dibaca.
${glossaryBlock()}`;

/** 5 talking points, generated ~6h before kickoff (homepage teaser). */
export function watchpointsPrompt(ctx: MatchContext): PromptResult {
  const { home, away } = ctx.fixture;
  return {
    system: SYSTEM,
    user: `Buat 5 "hal yang perlu diperhatikan" (talking points) untuk ${home.name} vs ${away.name} di Piala Dunia 2026.
Format: daftar bernomor 1-5, setiap poin 1-2 kalimat. Awali dengan judul "# 5 Hal yang Perlu Diperhatikan: ${home.name} vs ${away.name}".`,
  };
}
