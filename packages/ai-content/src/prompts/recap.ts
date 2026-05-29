import { glossaryBlock } from "../glossary/id-football-terms";
import type { MatchContext, PromptResult } from "./types";

const SYSTEM = `Kamu jurnalis sepak bola Indonesia yang menulis laporan pasca-pertandingan.
Tulis berdasarkan skor dan kejadian yang diberikan; jangan mengarang gol atau kejadian.
${glossaryBlock()}`;

/** Post-match recap, ~500 words, generated ~30min after full time. */
export function recapPrompt(ctx: MatchContext): PromptResult {
  const { home, away, homeGoals, awayGoals } = ctx.fixture;
  return {
    system: SYSTEM,
    user: `Tulis ulasan pasca-pertandingan (~500 kata) untuk ${home.name} ${homeGoals ?? "?"}-${awayGoals ?? "?"} ${away.name} di Piala Dunia 2026.

Sertakan: jalannya pertandingan, momen kunci, pemain terbaik (man of the match), dan apa arti hasil ini bagi kedua tim.
Awali dengan judul "# ${home.name} ${homeGoals ?? ""}-${awayGoals ?? ""} ${away.name}: <sudut pandang menarik>".`,
  };
}
