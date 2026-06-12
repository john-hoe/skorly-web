/**
 * Deterministic output-language check. The writer model occasionally ignores
 * the "Respond in X" wrapper and answers in the prompt's base language
 * (Indonesian) — 17/70 zh prediction articles shipped in Indonesian once.
 * Script-based heuristics are cheap and reliable enough to gate on.
 */

const VI_DIACRITICS =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi;

function countWords(haystack: string, words: string[]): number {
  let n = 0;
  for (const w of words) {
    n += haystack.split(` ${w} `).length - 1;
  }
  return n;
}

export function matchesLocaleLanguage(body: string, locale: string): boolean {
  const sample = body.slice(0, 2000);
  if (!sample.trim()) return false;
  const cjkRatio = (sample.match(/[\u4e00-\u9fff]/g)?.length ?? 0) / sample.length;

  switch (locale) {
    case "zh":
      return cjkRatio >= 0.2;
    case "vi":
      return cjkRatio < 0.05 && (sample.match(VI_DIACRITICS)?.length ?? 0) >= 20;
    case "en": {
      if (cjkRatio >= 0.05) return false;
      const lower = ` ${sample.toLowerCase().replace(/[^a-z\u00c0-\u1ef9]+/g, " ")} `;
      const en = countWords(lower, ["the", "and", "with", "match", "team", "will", "of"]);
      const id = countWords(lower, ["yang", "dan", "dengan", "pertandingan", "tim", "akan", "laga", "peluang"]);
      return en > id;
    }
    case "id": {
      if (cjkRatio >= 0.05) return false;
      const lower = ` ${sample.toLowerCase().replace(/[^a-z\u00c0-\u1ef9]+/g, " ")} `;
      const en = countWords(lower, ["the", "and", "with", "match", "team", "will", "of"]);
      const id = countWords(lower, ["yang", "dan", "dengan", "pertandingan", "tim", "akan", "laga", "peluang"]);
      return id >= en;
    }
    default:
      return true;
  }
}
