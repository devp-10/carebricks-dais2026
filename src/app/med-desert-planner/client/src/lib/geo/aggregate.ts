import type { DistrictScore } from '../../types';
import { isDataPoor } from '../labels';

export type StateAgg = {
  state: string;
  maxGap: number;
  districtCount: number;
  dataPoorShare: number;
};

export function aggregateToStates(rows: DistrictScore[]): StateAgg[] {
  const byState = new Map<string, DistrictScore[]>();
  for (const r of rows) {
    const arr = byState.get(r.state) ?? [];
    arr.push(r);
    byState.set(r.state, arr);
  }
  return Array.from(byState.entries()).map(([state, list]) => {
    const trusted = list.filter((r) => !isDataPoor(r.confidence_label, r.verdict_label));
    const maxGap = trusted.length ? Math.max(...trusted.map((r) => r.gap_score)) : 0;
    const dataPoorShare = list.length
      ? list.filter((r) => isDataPoor(r.confidence_label, r.verdict_label)).length / list.length
      : 0;
    return { state, maxGap, districtCount: trusted.length, dataPoorShare };
  });
}
