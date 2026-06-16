import { describe, it, expect } from 'vitest';
import { VERDICT, riskHex, isDataPoor, trustTier } from './labels';

describe('labels', () => {
  it('maps every verdict to copy + rank', () => {
    expect(VERDICT.likely_real_gap.copy).toBe('Likely real gap');
    expect(VERDICT.likely_real_gap.rank).toBe(0);
    expect(VERDICT.lower_priority.rank).toBe(3);
  });
  it('riskHex ramps neutral to crimson by gap score', () => {
    expect(riskHex(10)).toBe('#D7DBD2');
    expect(riskHex(90)).toBe('#B83A3A');
  });
  it('isDataPoor keys off confidence + verdict', () => {
    expect(isDataPoor('data_poor', 'data_poor_high_need')).toBe(true);
    expect(isDataPoor('sufficient_evidence', 'likely_real_gap')).toBe(false);
  });
  it('trustTier classifies a claim source_field', () => {
    expect(trustTier('specialties')).toBe('strong');
    expect(trustTier('capability')).toBe('partial');
    expect(trustTier('description')).toBe('weak');
  });
});
