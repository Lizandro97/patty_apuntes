// Pure business logic (mirror of app/services/records_service:calc_progress).
// Contract: Math.round half-up on both sides (Python: int(x + 0.5)).

/** Progress 0-100 of reviewed cells over total. */
export function calcProgress(reviewed: number, total: number): number {
  if (!total) return 0;
  return Math.round((reviewed * 100) / total);
}
