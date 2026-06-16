import { useMemo } from 'react';
import { useAnalyticsQuery } from '@databricks/appkit-ui/react';
import { sql } from '@databricks/appkit-ui/js';
import type {
  SpecialtyRow,
  StateRow,
  ScenarioRow,
  DistrictScore,
  EvidenceRow,
  DemandDetail,
} from '../types';

const NONE = '__none__';

export type PlannerFilters = {
  specialty: string;
  /** '' = All — India */
  state: string;
  /** 'All verdicts' or a verdict label */
  verdict: string;
};

export function useReferenceData() {
  const { data: specialties = [], loading: specialtiesLoading } = useAnalyticsQuery('specialties');
  const { data: states = [] } = useAnalyticsQuery('states');
  const { data: scenarios = [] } = useAnalyticsQuery('saved_scenarios');
  return {
    specialties: (specialties ?? []) as SpecialtyRow[],
    states: (states ?? []) as StateRow[],
    scenarios: (scenarios ?? []) as ScenarioRow[],
    specialtiesLoading,
  };
}

export function useDistrictScores(filters: PlannerFilters) {
  const params = useMemo(
    () => ({
      specialty: sql.string(filters.specialty || NONE),
      state: sql.string(filters.state || 'All states'),
      verdict: sql.string(filters.verdict || 'All verdicts'),
    }),
    [filters.specialty, filters.state, filters.verdict],
  );
  const { data = [], loading, error } = useAnalyticsQuery('district_scores', params);
  return { rows: (data ?? []) as DistrictScore[], loading, error };
}

export function useDistrictDetail(args: { specialty: string; state: string; district: string }) {
  const hasEvidence = Boolean(args.specialty && args.state);
  const hasDemand = Boolean(args.state && args.district);
  const evidenceParams = useMemo(
    () => ({
      specialty: sql.string(hasEvidence ? args.specialty : NONE),
      state: sql.string(hasEvidence ? args.state : NONE),
      district: sql.string(hasEvidence ? args.district || '__all__' : NONE),
    }),
    [hasEvidence, args.specialty, args.state, args.district],
  );
  const demandParams = useMemo(
    () => ({
      state: sql.string(hasDemand ? args.state : NONE),
      district: sql.string(hasDemand ? args.district : NONE),
    }),
    [hasDemand, args.state, args.district],
  );

  const {
    data: evidence = [],
    loading: evidenceLoading,
    error: evidenceError,
  } = useAnalyticsQuery('district_evidence', evidenceParams);
  const { data: demand = [], loading: demandLoading } = useAnalyticsQuery(
    'district_demand_detail',
    demandParams,
  );

  return {
    evidence: (evidence ?? []) as EvidenceRow[],
    demand: ((demand ?? []) as DemandDetail[])[0] ?? null,
    loading: evidenceLoading || demandLoading,
    error: evidenceError,
  };
}
