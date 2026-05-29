import { glossaryBlock } from "../glossary/id-football-terms";
import type { GroupContext, PromptResult } from "./types";

const SYSTEM = `Kamu jurnalis sepak bola Indonesia. Tulis analisis grup Piala Dunia yang komprehensif namun enak dibaca.
${glossaryBlock()}`;

/** Group analysis, ~800 words. Generated before/during/after group stage. */
export function groupAnalysisPrompt(ctx: GroupContext): PromptResult {
  return {
    system: SYSTEM,
    user: `Tulis analisis (~800 kata) untuk Grup ${ctx.groupName} Piala Dunia 2026.

Tim di grup: ${ctx.teams.join(", ")}.
Klasemen/konteks: ${ctx.standingsSummary ?? "fase awal, belum ada hasil"}.

Bahas: favorit lolos, kuda hitam, pemain yang patut diperhatikan, dan prediksi peringkat akhir grup.
Awali dengan judul "# Analisis Grup ${ctx.groupName} Piala Dunia 2026".`,
  };
}
