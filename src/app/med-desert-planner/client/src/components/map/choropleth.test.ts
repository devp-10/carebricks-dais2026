import { describe, it, expect } from 'vitest';
import { fillColorExpression, featureStateFor } from './choropleth';
import type { DistrictScore } from '../../types';

describe('choropleth', () => {
  it('builds a data-driven fill-color expression with a case head', () => {
    const expr = fillColorExpression();
    expect(Array.isArray(expr)).toBe(true);
    expect(expr[0]).toBe('case');
  });
  it('featureStateFor returns gap + dataPoor for a district', () => {
    const fs = featureStateFor({
      gap_score: 80,
      confidence_label: 'data_poor',
      verdict_label: 'data_poor_high_need',
    } as DistrictScore);
    expect(fs.gap).toBe(80);
    expect(fs.dataPoor).toBe(true);
    expect(fs.has).toBe(true);
  });
});
