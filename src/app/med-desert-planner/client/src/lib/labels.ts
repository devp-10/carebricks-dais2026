import type { VerdictLabel, ConfidenceLabel } from '../types';

export const VERDICT: Record<VerdictLabel, { copy: string; rank: number; tone: string }> = {
  likely_real_gap: { copy: 'Likely real gap', rank: 0, tone: 'risk-high' },
  data_poor_high_need: { copy: 'Data-poor high need', rank: 1, tone: 'data-poor' },
  mixed_evidence: { copy: 'Mixed evidence', rank: 2, tone: 'risk-mid' },
  lower_priority: { copy: 'Lower priority', rank: 3, tone: 'risk-low' },
};

export const CONFIDENCE_COPY: Record<string, string> = {
  sufficient_evidence: 'Sufficient evidence',
  data_poor: 'Low evidence',
  demand_uncertain: 'Demand uncertain',
};

// Sequential risk ramp: quiet neutral -> amber -> terracotta -> crimson. Stops over gap 0..100.
export const RISK_STOPS: Array<[number, string]> = [
  [0, '#D7DBD2'],
  [40, '#F0B84F'],
  [70, '#D96B3D'],
  [85, '#B83A3A'],
];

export const DATA_POOR_HEX = '#9AA1AB';
export const NO_DATA_HEX = '#ECEAE3';

export function riskHex(gap: number | null | undefined): string {
  if (gap === null || gap === undefined || Number.isNaN(gap)) return DATA_POOR_HEX;
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
  strong: 'Strong claim',
  partial: 'Partial claim',
  weak: 'Weak claim',
  no_claim: 'No claim',
};
