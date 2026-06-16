import { describe, it, expect } from 'vitest';
import { bandGeometry, quadrant } from './stats';

describe('stats', () => {
  it('bandGeometry maps a 0..1 interval to 0..100% positions', () => {
    const g = bandGeometry(0.2, 0.5, 0.35);
    expect(g.loPct).toBeCloseTo(20);
    expect(g.hiPct).toBeCloseTo(50);
    expect(g.widthPct).toBeCloseTo(30);
    expect(g.pointPct).toBeCloseTo(35);
  });
  it('bandGeometry clamps to [0,100]', () => {
    const g = bandGeometry(-0.1, 1.4, 2);
    expect(g.loPct).toBe(0);
    expect(g.hiPct).toBe(100);
    expect(g.pointPct).toBe(100);
  });
  it('quadrant places a high-gap/high-confidence district in act-now', () => {
    expect(quadrant(85, true)).toBe('act_now');
    expect(quadrant(85, false)).toBe('collect_data');
    expect(quadrant(20, true)).toBe('covered');
    expect(quadrant(20, false)).toBe('lower_priority');
  });
});
