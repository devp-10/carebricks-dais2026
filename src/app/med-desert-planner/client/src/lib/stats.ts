const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

export function bandGeometry(lo: number, hi: number, point: number) {
  const loPct = clamp(lo * 100);
  const hiPct = clamp(hi * 100);
  const pointPct = clamp(point * 100);
  return { loPct, hiPct, widthPct: Math.max(0, hiPct - loPct), pointPct };
}

export type Quadrant = 'act_now' | 'collect_data' | 'covered' | 'lower_priority';

export function quadrant(gapScore: number, confident: boolean): Quadrant {
  const highGap = gapScore >= 60;
  if (highGap && confident) return 'act_now';
  if (highGap && !confident) return 'collect_data';
  if (!highGap && confident) return 'covered';
  return 'lower_priority';
}

export const QUADRANT_COPY: Record<Quadrant, string> = {
  act_now: 'Act now',
  collect_data: 'Go collect data',
  covered: 'Covered',
  lower_priority: 'Lower priority',
};

export const QUADRANT_BLURB: Record<Quadrant, string> = {
  act_now: 'High need and the evidence holds. A real priority for outreach.',
  collect_data: 'High need, but the records are too thin to trust. Verify before deploying.',
  covered: 'Documented supply looks adequate relative to need. Lower priority.',
  lower_priority: 'Lower modelled need. Not a near-term focus.',
};
