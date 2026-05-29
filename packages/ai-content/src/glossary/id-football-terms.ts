/**
 * Locked Indonesian football terminology. Injected into generation prompts so
 * the model uses the terms Indonesian fans actually search/read, not literal
 * translations. Extend as QA surfaces awkward phrasings.
 */
export const ID_FOOTBALL_TERMS: Record<string, string> = {
  match: "pertandingan",
  fixture: "jadwal",
  schedule: "jadwal",
  standings: "klasemen",
  group: "grup",
  "group stage": "fase grup",
  "knockout stage": "babak gugur",
  "round of 32": "babak 32 besar",
  "round of 16": "babak 16 besar",
  quarterfinal: "perempat final",
  semifinal: "semifinal",
  final: "final",
  result: "hasil",
  score: "skor",
  goal: "gol",
  assist: "assist",
  penalty: "penalti",
  "free kick": "tendangan bebas",
  "corner kick": "tendangan sudut",
  offside: "offside",
  "yellow card": "kartu kuning",
  "red card": "kartu merah",
  substitution: "pergantian pemain",
  lineup: "susunan pemain",
  formation: "formasi",
  coach: "pelatih",
  striker: "penyerang",
  midfielder: "gelandang",
  defender: "bek",
  goalkeeper: "kiper",
  "man of the match": "pemain terbaik",
  prediction: "prediksi",
  preview: "pratinjau",
  "head to head": "rekor pertemuan",
  injury: "cedera",
  "extra time": "babak tambahan",
  "penalty shootout": "adu penalti",
};

export function glossaryBlock(): string {
  const lines = Object.entries(ID_FOOTBALL_TERMS).map(
    ([en, id]) => `- ${en} -> ${id}`
  );
  return `Gunakan istilah sepak bola Indonesia yang benar:\n${lines.join("\n")}`;
}
