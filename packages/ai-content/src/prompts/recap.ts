import { glossaryBlock } from "../glossary/id-football-terms";
import type { MatchContext, PromptResult } from "./types";

const SYSTEM = `Kamu jurnalis sepak bola Indonesia yang menulis laporan pasca-pertandingan.
Tulis hanya berdasarkan skor dan kejadian terverifikasi yang diberikan; jangan mengarang gol, assist, kartu, statistik, venue, atau narasi pertandingan.
Jika fakta terverifikasi tipis, tulis laporan pendek yang akurat, bukan artikel panjang yang spekulatif.
${glossaryBlock()}`;

/** Post-match recap. Length scales with the amount of verified match facts. */
export function recapPrompt(ctx: MatchContext): PromptResult {
  const { home, away, homeGoals, awayGoals } = ctx.fixture;
  return {
    system: SYSTEM,
    user: `Tulis laporan pasca-pertandingan untuk ${home.name} ${homeGoals ?? "?"}-${awayGoals ?? "?"} ${away.name} di Piala Dunia 2026.

Aturan fakta:
- Gunakan HANYA fakta terverifikasi yang akan diberikan setelah instruksi ini.
- Jangan menulis comeback, dominasi, tekanan, penyelamatan, assist, pencetak gol, menit gol, man of the match, xG, penguasaan bola, atau statistik lain kecuali fakta terverifikasi menyebutkannya.
- Jika fakta hanya berisi skor akhir dan sedikit konteks, tulis 120-180 kata saja: skor, konteks turnamen, dampak umum bagi kedua tim.
- Jika fakta mencantumkan gol/kartu/kejadian spesifik, boleh tulis 300-500 kata dengan urutan kejadian tersebut.
Awali dengan judul "# ${home.name} ${homeGoals ?? ""}-${awayGoals ?? ""} ${away.name}: <sudut pandang menarik>".`,
  };
}
