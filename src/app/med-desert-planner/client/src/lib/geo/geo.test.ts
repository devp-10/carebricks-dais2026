import { describe, it, expect } from 'vitest';
import { normalizeName } from './normalize';
import { matchDistrictFeature } from './matchDistrict';
import { aggregateToStates } from './aggregate';
import type { DistrictScore } from '../../types';

describe('geo.normalize', () => {
  it('lowercases, strips punctuation, collapses spaces', () => {
    expect(normalizeName('  Pashchim  Champaran ')).toBe('pashchim champaran');
    expect(normalizeName('Bengaluru (Urban)')).toBe('bengaluru urban');
  });
});

describe('geo.match', () => {
  const features = [
    { district: 'Araria', normalized: 'araria' },
    { district: 'West Champaran', normalized: 'west champaran' },
  ];
  it('matches exact normalized name', () => {
    expect(matchDistrictFeature('Araria', 'Bihar', features)?.district).toBe('Araria');
  });
  it('resolves a known alias (Pashchim Champaran -> West Champaran)', () => {
    expect(matchDistrictFeature('Pashchim Champaran', 'Bihar', features)?.district).toBe(
      'West Champaran',
    );
  });
  it('returns null when unmatched', () => {
    expect(matchDistrictFeature('Nowhere', 'Bihar', features)).toBeNull();
  });
});

describe('geo.aggregate', () => {
  const base = (state: string, gap: number, dp = false): DistrictScore => ({
    district_name: state + gap,
    state,
    specialty: 'sp',
    demand_score: 50,
    demand_label: 'x',
    n_facilities: 2,
    k_facilities: 1,
    claim_count: 1,
    documented_supply_rate: 0.3,
    wilson_lo: 0.1,
    wilson_hi: 0.5,
    gap_score: gap,
    confidence_label: dp ? 'data_poor' : 'sufficient_evidence',
    verdict_label: dp ? 'data_poor_high_need' : 'likely_real_gap',
  });
  it('rolls district rows up to a worst-case state gap', () => {
    const agg = aggregateToStates([base('Bihar', 80), base('Bihar', 40), base('Goa', 20, true)]);
    const bihar = agg.find((a) => a.state === 'Bihar')!;
    expect(bihar.maxGap).toBe(80);
    expect(bihar.districtCount).toBe(2);
    const goa = agg.find((a) => a.state === 'Goa')!;
    expect(goa.dataPoorShare).toBe(1);
  });
});
