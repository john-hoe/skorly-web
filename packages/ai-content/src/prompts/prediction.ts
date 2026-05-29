import { glossaryBlock } from "../glossary/id-football-terms";
import type { MatchContext, PromptResult } from "./types";

const SYSTEM = `Kamu analis sepak bola Indonesia. Berikan prediksi yang beralasan berdasarkan data.
PENTING: jangan menyebut taruhan, odds, bandar, atau ajakan judi. Ini analisis editorial, bukan tips judi.
${glossaryBlock()}`;

/** Prediction with reasoning + confidence, generated ~2h before kickoff. */
export function predictionPrompt(ctx: MatchContext): PromptResult {
  const { home, away } = ctx.fixture;
  return {
    system: SYSTEM,
    user: `Tulis prediksi (~300 kata) untuk ${home.name} vs ${away.name} di Piala Dunia 2026.

Sertakan:
- Analisis kekuatan & kelemahan kedua tim
- Prediksi skor akhir
- Tingkat keyakinan (rendah/sedang/tinggi) dengan alasan
- Faktor X yang bisa menentukan hasil

Form ${home.name}: ${ctx.homeForm?.join(" ") ?? "n/a"}
Form ${away.name}: ${ctx.awayForm?.join(" ") ?? "n/a"}

Awali dengan judul "# Prediksi: ${home.name} vs ${away.name}".`,
  };
}
