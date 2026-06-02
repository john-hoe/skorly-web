/**
 * 二期 M6 — parametric GPT-Image poster prompts.
 *
 * Three templates keep all 48 nations on-brand and batchable:
 *  - "star":       recognizable star-player visual (aggressive posture).
 *  - "totem":      national totem-animal duel (safe alternative).
 *  - "silhouette": kit-coloured action silhouette, no faces (safest).
 *
 * Compliance guardrails baked into every prompt: NO official crests, NO
 * sponsor/kit-maker logos, NO fabricated endorsements — only kit colours,
 * flag motifs and a Skorly watermark. These are enforced as explicit
 * negative instructions so generations stay defensible.
 */

export type PosterVariant = "star" | "totem" | "silhouette";

export interface TeamIdentityInput {
  name: string;
  alias?: string | null;
  totemAnimal?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  flagEmoji?: string | null;
  starPlayer?: string | null;
  starNumber?: number | null;
}

const COMMON_NEGATIVE =
  "Do NOT include any official team crest/badge, FIFA marks, kit-manufacturer or sponsor logos, real photographs, or text claiming endorsements. No watermarks except a small 'Skorly' wordmark in a bottom corner.";

const STYLE =
  "Dramatic sports-poster illustration, dynamic composition, stadium-light atmosphere, high contrast, vertical 4:5 framing, leave clear space at top-center for a headline.";

function colors(t: TeamIdentityInput): string {
  const parts = [t.primaryColor, t.secondaryColor].filter(Boolean);
  return parts.length ? parts.join(" and ") : "their national kit colours";
}

function star(t: TeamIdentityInput): string {
  const who = t.starPlayer ? `a player resembling ${t.starPlayer}` : "the team's star forward";
  const num = t.starNumber ? ` wearing number ${t.starNumber}` : "";
  return `${who}${num} of ${t.name} in a ${colors(t)} kit, confident hero pose`;
}

function totem(t: TeamIdentityInput): string {
  const animal = t.totemAnimal ?? "national emblem animal";
  return `a powerful stylised ${animal} representing ${t.name}, rendered in ${colors(t)} with subtle flag-colour accents`;
}

function silhouette(t: TeamIdentityInput): string {
  return `a dynamic action silhouette of a footballer in ${colors(t)} kit for ${t.name}, no visible face`;
}

function subject(t: TeamIdentityInput, variant: PosterVariant): string {
  if (variant === "star") return star(t);
  if (variant === "totem") return totem(t);
  return silhouette(t);
}

/** Pre-match versus poster: home vs away in the chosen template. */
export function buildPrematchPoster(
  home: TeamIdentityInput,
  away: TeamIdentityInput,
  variant: PosterVariant = "totem",
): string {
  return [
    `${STYLE}`,
    `Head-to-head World Cup 2026 match poster: ${subject(home, variant)} on the left, facing ${subject(away, variant)} on the right, separated by a glowing "VS" in the center.`,
    `Include small ${home.flagEmoji ?? ""} ${away.flagEmoji ?? ""} flag-colour motifs.`.trim(),
    COMMON_NEGATIVE,
  ].join(" ");
}

/** Post-match result card: winner emphasised, scoreline space reserved. */
export function buildResultCard(
  home: TeamIdentityInput,
  away: TeamIdentityInput,
  homeGoals: number,
  awayGoals: number,
  variant: PosterVariant = "totem",
): string {
  const lead = homeGoals === awayGoals ? "balanced" : homeGoals > awayGoals ? "left side triumphant" : "right side triumphant";
  return [
    `${STYLE}`,
    `World Cup 2026 result card, ${lead}: ${subject(home, variant)} vs ${subject(away, variant)}.`,
    `Reserve a bold central band for the final score "${homeGoals} - ${awayGoals}".`,
    COMMON_NEGATIVE,
  ].join(" ");
}
