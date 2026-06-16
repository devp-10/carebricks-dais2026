import type { VerdictLabel, ConfidenceLabel } from '../types';

export const VERDICT: Record<VerdictLabel, { copy: string; rank: number; tone: string }> = {
  likely_real_gap: { copy: 'Likely real gap', rank: 0, tone: 'risk-high' },
  data_poor_high_need: { copy: 'Data-poor high need', rank: 1, tone: 'data-poor' },
  mixed_evidence: { copy: 'Mixed evidence', rank: 2, tone: 'risk-mid' },
  lower_priority: { copy: 'Lower priority', rank: 3, tone: 'risk-low' },
};

export const CONFIDENCE_COPY: Record<string, string> = {
  sufficient_evidence: 'Sufficient evidence',
  data_poor: 'Data-poor',
  demand_uncertain: 'Demand uncertain',
};

// Sequential risk ramp: slate → amber → terracotta → crimson. Stops over gap 0..100.
const RISK_STOPS: Array<[number, string]> = [
  [0, '#5B6472'],
  [40, '#E6A23C'],
  [70, '#D2693F'],
  [85, '#B23B3B'],
];

export function riskHex(gap: number | null | undefined): string {
  if (gap === null || gap === undefined || Number.isNaN(gap)) return '#9AA1AB';
  let chosen = RISK_STOPS[0][1];
  for (const [threshold, hex] of RISK_STOPS) if (gap >= threshold) chosen = hex;
  return chosen;
}

export function isDataPoor(confidence: ConfidenceLabel, verdict: VerdictLabel): boolean {
  return confidence === 'data_poor' || verdict === 'data_poor_high_need';
}

export type TrustTier = 'strong' | 'partial' | 'weak' | 'no_claim';

export function trustTier(sourceField: string): TrustTier {
  if (sourceField === 'specialties') return 'strong';
  if (sourceField === 'capability' || sourceField === 'procedure' || sourceField === 'equipment')
    return 'partial';
  if (sourceField === 'description') return 'weak';
  return 'no_claim';
}

export const TRUST_HEX: Record<TrustTier, string> = {
  strong: '#2E8B6F',
  partial: '#C98A2E',
  weak: '#B23B3B',
  no_claim: '#9AA1AB',
};

export const TRUST_COPY: Record<TrustTier, string> = {
  strong: 'Strong',
  partial: 'Partial',
  weak: 'Weak',
  no_claim: 'No claim',
};
