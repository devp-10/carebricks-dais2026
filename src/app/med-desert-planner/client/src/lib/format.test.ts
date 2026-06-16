import { describe, it, expect } from 'vitest';
import { pct, score, displaySpecialty } from './format';

describe('format', () => {
  it('pct rounds a 0..1 ratio', () => {
    expect(pct(0.823)).toBe('82%');
  });
  it('pct guards null/NaN', () => {
    expect(pct(null)).toBe('—');
    expect(pct(NaN)).toBe('—');
  });
  it('score rounds and guards', () => {
    expect(score(85.6)).toBe('86');
    expect(score(null)).toBe('—');
  });
  it('displaySpecialty prefers display name, falls back to humanized machine name', () => {
    expect(displaySpecialty('gynecologyAndObstetrics', 'Gynecology & Obstetrics')).toBe(
      'Gynecology & Obstetrics',
    );
    expect(displaySpecialty('internalMedicine', '')).toBe('Internal Medicine');
  });
});
