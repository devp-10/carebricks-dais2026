import { describe, it, expect } from 'vitest';
import { groupByVerdict, groupEvidence } from './group';
import type { DistrictScore, EvidenceRow } from '../types';

const d = (over: Partial<DistrictScore>): DistrictScore => ({
  district_name: 'X',
  state: 'S',
  specialty: 'sp',
  demand_score: 50,
  demand_label: 'high_need',
  n_facilities: 3,
  k_facilities: 1,
  claim_count: 2,
  documented_supply_rate: 0.3,
  wilson_lo: 0.1,
  wilson_hi: 0.6,
  gap_score: 50,
  confidence_label: 'sufficient_evidence',
  verdict_label: 'lower_priority',
  ...over,
});

describe('group', () => {
  it('groups districts in verdict rank order, dropping empty groups', () => {
    const rows = [d({ verdict_label: 'lower_priority' }), d({ verdict_label: 'likely_real_gap' })];
    const groups = groupByVerdict(rows);
    expect(groups[0].verdict).toBe('likely_real_gap');
    expect(groups.map((g) => g.verdict)).not.toContain('mixed_evidence');
  });
  it('groups evidence rows by facility preserving claim order', () => {
    const e = (id: string, claim: string): EvidenceRow => ({
      district_name: 'X',
      state: 'S',
      specialty: 'sp',
      facility_id: id,
      facility_name: 'F' + id,
      facility_type: null,
      city: null,
      pin_code: null,
      latitude: null,
      longitude: null,
      source_url: null,
      claim_id: id + claim,
      source_field: 'capability',
      claim_text: claim,
    });
    const grouped = groupEvidence([e('1', 'a'), e('1', 'b'), e('2', 'c')]);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].claims.map((c) => c.claim_text)).toEqual(['a', 'b']);
  });
});
