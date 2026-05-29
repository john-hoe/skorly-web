import { glossaryBlock } from "../glossary/id-football-terms";
import type { MatchContext, PromptResult } from "./types";

const SYSTEM = `Kamu analis taktik sepak bola Indonesia. Jelaskan taktik dengan bahasa yang mudah dipahami penggemar awam, tapi tetap berbobot.
${glossaryBlock()}`;

/** Tactical breakdown, ~400 words, generated ~2h after full time. */
export function tacticalPrompt(ctx: MatchContext): PromptResult {
  const { home, away } = ctx.fixture;
  return {
    system: SYSTEM,
    user: `Tulis analisis taktik (~400 kata) untuk ${home.name} vs ${away.name} di Piala Dunia 2026.

Bahas: formasi kedua tim, duel lini tengah, transisi serang-bertahan, dan keputusan pelatih yang menentukan.
Awali dengan judul "# Analisis Taktik: ${home.name} vs ${away.name}".`,
  };
}
