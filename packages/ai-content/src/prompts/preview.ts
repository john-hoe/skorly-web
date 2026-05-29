import { glossaryBlock } from "../glossary/id-football-terms";
import type { MatchContext, PromptResult } from "./types";

const SYSTEM = `Kamu adalah jurnalis sepak bola Indonesia berpengalaman yang menulis untuk media seperti Bola.net.
Tulis dalam Bahasa Indonesia yang natural, mengalir, dan enak dibaca penggemar bola Indonesia.
Hindari gaya terjemahan kaku. Jangan mengarang statistik yang tidak diberikan.
${glossaryBlock()}`;

/** Pre-match preview, ~500 words, generated ~24h before kickoff. */
export function previewPrompt(ctx: MatchContext): PromptResult {
  const { home, away } = ctx.fixture;
  return {
    system: SYSTEM,
    user: `Tulis artikel pratinjau (~500 kata) untuk pertandingan ${home.name} vs ${away.name} di Piala Dunia 2026.

Data:
- Grup: ${ctx.fixture.groupName ?? "-"}
- Babak: ${ctx.fixture.stage ?? "-"}
- Kickoff: ${ctx.fixture.kickoffAt ?? "-"}
- Form ${home.name}: ${ctx.homeForm?.join(" ") ?? "tidak tersedia"}
- Form ${away.name}: ${ctx.awayForm?.join(" ") ?? "tidak tersedia"}
- Pemain kunci ${home.name}: ${ctx.keyPlayersHome?.join(", ") ?? "-"}
- Pemain kunci ${away.name}: ${ctx.keyPlayersAway?.join(", ") ?? "-"}
- Rekor pertemuan: ${ctx.headToHead ?? "tidak tersedia"}

Struktur: paragraf pembuka yang menarik, kondisi kedua tim, pemain yang patut diperhatikan, dan konteks taktik. Beri judul yang SEO-friendly di baris pertama dengan format "# Judul".`,
  };
}
