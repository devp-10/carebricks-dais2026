import type { ExpressionSpecification } from 'maplibre-gl';
import type { DistrictScore } from '../../types';
import { isDataPoor } from '../../lib/labels';

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
    '#ECEAE3',
    ['to-boolean', ['coalesce', ['feature-state', 'dataPoor'], false]],
    '#9AA1AB',
    [
      'interpolate',
      ['linear'],
      ['coalesce', ['feature-state', 'gap'], 0],
      0,
      '#5B6472',
      40,
      '#E6A23C',
      70,
      '#D2693F',
      85,
      '#B23B3B',
    ],
  ] as ExpressionSpecification;
}

export function fillOpacityExpression(hoveredId: boolean): number {
  return hoveredId ? 0.92 : 0.82;
}
