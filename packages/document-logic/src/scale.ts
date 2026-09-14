// Year scale (mirror of ensure_cells/sync_scale).

/** Max allowed range width (records: SCALE_TOO_WIDE). */
export const MAX_SCALE_YEARS = 20;

/** Years included in [start, end]. Empty when the range is invalid. */
export function rangeYears(start: number, end: number): number[] {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) return [];
  const out: number[] = [];
  for (let y = start; y <= end; y++) out.push(y);
  return out;
}
