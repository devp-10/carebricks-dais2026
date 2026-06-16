import type { DistrictScore, EvidenceRow, VerdictLabel } from '../types';
import { VERDICT } from './labels';

export type VerdictGroup = { verdict: VerdictLabel; districts: DistrictScore[] };

export function groupByVerdict(rows: DistrictScore[]): VerdictGroup[] {
  const order = (Object.keys(VERDICT) as VerdictLabel[]).sort(
    (a, b) => VERDICT[a].rank - VERDICT[b].rank,
  );
  return order
    .map((verdict) => ({ verdict, districts: rows.filter((r) => r.verdict_label === verdict) }))
    .filter((g) => g.districts.length > 0);
}

export type FacilityEvidence = EvidenceRow & { claims: EvidenceRow[] };

export function groupEvidence(rows: EvidenceRow[]): FacilityEvidence[] {
  const byFacility = new Map<string, FacilityEvidence>();
  for (const row of rows) {
    const existing = byFacility.get(row.facility_id);
    if (existing) existing.claims.push(row);
    else byFacility.set(row.facility_id, { ...row, claims: [row] });
  }
  return Array.from(byFacility.values());
}
