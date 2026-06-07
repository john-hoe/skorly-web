export const LIVE_POLL_MS = 60_000;

export function isLivePollingWindow(
  status: string,
  kickoffAt: string | null,
  nowMs = Date.now(),
): boolean {
  if (status === "live") return true;
  if (status === "finished" || status === "cancelled" || status === "postponed") return false;
  if (!kickoffAt) return false;
  const kickoffMs = Date.parse(kickoffAt);
  if (!Number.isFinite(kickoffMs)) return false;
  return nowMs >= kickoffMs - 15 * 60 * 1000 && nowMs <= kickoffMs + 4 * 60 * 60 * 1000;
}
