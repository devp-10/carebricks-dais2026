import type { VerdictLabel, ConfidenceLabel } from '../types';

export const VERDICT: Record<VerdictLabel, { copy: string; rank: number; tone: string }> = {
  likely_real_gap: { copy: 'Confirmed gap', rank: 0, tone: 'risk-high' },
  data_poor_high_need: { copy: 'Likely high demand', rank: 1, tone: 'data-poor' },
  mixed_evidence: { copy: 'Mixed signals', rank: 2, tone: 'risk-mid' },
  lower_priority: { copy: 'Lower demand', rank: 3, tone: 'risk-low' },
};

export const CONFIDENCE_COPY: Record<string, string> = {
  sufficient_evidence: 'Confirmed',
  data_poor: 'Unverified',
  demand_uncertain: 'Uncertain demand',
};

// Sequential risk ramp: sage green → gold → amber → terracotta → crimson. Stops over gap 0..100.
export const RISK_STOPS: Array<[number, string]> = [
  [0,  '#C5DFB8'],
  [25, '#EDD87A'],
  [50, '#F0A040'],
  [70, '#D96B3D'],
  [85, '#B83A3A'],
];

export const DATA_POOR_HEX = '#C8A96A';
export const NO_DATA_HEX = '#ECEAE3';
export const FACILITY_DOT_HEX = '#2f6bff';

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
  strong: 'High confidence',
  partial: 'Medium confidence',
  weak: 'Low confidence',
  no_claim: 'Not documented',
};
