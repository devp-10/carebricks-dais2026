import type { ExpressionSpecification } from 'maplibre-gl';
import type { DistrictScore } from '../../types';
import { DATA_POOR_HEX, isDataPoor, NO_DATA_HEX, RISK_STOPS } from '../../lib/labels';

export type FeatureGapState = { has: boolean; gap: number; dataPoor: boolean };

export function featureStateFor(row: DistrictScore): FeatureGapState {
  return {
    has: true,
    gap: row.gap_score ?? 0,
    dataPoor: isDataPoor(row.confidence_label, row.verdict_label),
  };
}

/** State-level state from an aggregate (national choropleth). */
export function stateFeatureState(maxGap: number, dataPoorShare: number, districtCount: number): FeatureGapState {
  return { has: districtCount > 0 || dataPoorShare > 0, gap: maxGap, dataPoor: districtCount === 0 && dataPoorShare > 0 };
}

/**
 * Data-driven fill color keyed on feature-state:
 *  - no data in view  → faint neutral
 *  - data-poor        → flat gray (confidence channel)
 *  - otherwise        → interpolate gap over the warm risk ramp (risk channel)
 */
export function fillColorExpression(): ExpressionSpecification {
  return [
    'case',
    ['!', ['to-boolean', ['coalesce', ['feature-state', 'has'], false]]],
    NO_DATA_HEX,
    ['to-boolean', ['coalesce', ['feature-state', 'dataPoor'], false]],
    DATA_POOR_HEX,
    [
      'interpolate',
      ['linear'],
      ['coalesce', ['feature-state', 'gap'], 0],
      ...RISK_STOPS.flat(),
    ],
  ] as ExpressionSpecification;
}

export function fillOpacityExpression(hoveredId: boolean): number {
  return hoveredId ? 0.92 : 0.82;
}
