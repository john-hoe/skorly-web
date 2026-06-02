import type { SignalEntities } from "./types";

/**
 * Light entity extraction: match known team names (case-insensitive, word-ish
 * boundary) inside a text. Players are left empty for P1 — they're better
 * extracted later by the LLM fact-extraction step.
 *
 * `teamNames` should come from the DB (teams table) so it stays in sync.
 */
export function extractEntities(
  text: string,
  teamNames: string[]
): SignalEntities {
  const lower = text.toLowerCase();
  const teams: string[] = [];
  for (const name of teamNames) {
    const n = name.trim();
    if (n.length < 3) continue;
    if (lower.includes(n.toLowerCase())) teams.push(n);
  }
  return { teams: dedupe(teams), players: [] };
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr));
}
