import { glossaryBlock } from "../glossary/id-football-terms";
import type { MatchContext, PromptResult } from "./types";

const SYSTEM = `Kamu analis sepak bola Indonesia. Berikan prediksi yang beralasan berdasarkan data.
PENTING: jangan menyebut taruhan, odds, bandar, atau ajakan judi. Ini analisis editorial, bukan tips judi.
${glossaryBlock()}`;

/**
 * Confidence label derived from the model's strongest outcome probability,
 * dampened when the model itself has little real data behind it.
 */
function confidenceLabel(f: NonNullable<MatchContext["forecast"]>): string {
  const top = Math.max(f.probabilities.homeWin, f.probabilities.draw, f.probabilities.awayWin);
  if (f.confidence < 0.3) return "rendah";
  if (top >= 50) return "tinggi";
  if (top >= 40) return "sedang";
  return "rendah";
}

/**
 * Prediction with reasoning + confidence. When a model forecast is supplied
 * the predicted score MUST follow it (facts-in-prompt — same lesson as the
 * recap pipeline: the writer may not invent its own numbers).
 */
export function predictionPrompt(ctx: MatchContext): PromptResult {
  const { home, away } = ctx.fixture;
  const f = ctx.forecast;

  const dataBlock = f
    ? `
DATA MODEL STATISTIK INTERNAL (Elo + Poisson — WAJIB jadi dasar prediksi):
- Peluang menang ${home.name}: ${f.probabilities.homeWin}%
- Peluang seri: ${f.probabilities.draw}%
- Peluang menang ${away.name}: ${f.probabilities.awayWin}%
- Skor paling mungkin menurut model: ${f.mostLikelyScore.home}-${f.mostLikelyScore.away}
- Skor alternatif teratas: ${f.topScores
        .map((s) => `${s.home}-${s.away} (${s.prob}%)`)
        .join(", ")}

ATURAN DATA (WAJIB):
- Prediksi skor akhir HARUS persis ${f.mostLikelyScore.home}-${f.mostLikelyScore.away} (skor paling mungkin menurut model).
- Sebut persentase peluang di atas dalam analisis sebagai "model statistik kami".
- Tingkat keyakinan: ${confidenceLabel(f)}.
- JANGAN mengarang statistik atau angka lain di luar data yang diberikan.
`
    : "";

  return {
    system: SYSTEM,
    user: `Tulis prediksi (~300 kata) untuk ${home.name} vs ${away.name} di Piala Dunia 2026.
${dataBlock}
Sertakan:
- Analisis kekuatan & kelemahan kedua tim
- Prediksi skor akhir${f ? ` (wajib ${f.mostLikelyScore.home}-${f.mostLikelyScore.away})` : ""}
- Tingkat keyakinan (rendah/sedang/tinggi) dengan alasan
- Faktor X yang bisa menentukan hasil

Form ${home.name}: ${ctx.homeForm?.join(" ") ?? "n/a"}
Form ${away.name}: ${ctx.awayForm?.join(" ") ?? "n/a"}

Awali dengan judul "# Prediksi: ${home.name} vs ${away.name}".`,
  };
}
