export type SpecialtyRow = { specialty: string; display_name: string; facility_count: number };
export type StateRow = { state: string };

export type VerdictLabel =
  | 'likely_real_gap'
  | 'data_poor_high_need'
  | 'mixed_evidence'
  | 'lower_priority';
export type ConfidenceLabel = 'sufficient_evidence' | 'data_poor' | (string & {});

export type DistrictScore = {
  district_name: string;
  state: string;
  specialty: string;
  demand_score: number;
  demand_label: string;
  n_facilities: number;
  k_facilities: number;
  claim_count: number;
  documented_supply_rate: number;
  wilson_lo: number;
  wilson_hi: number;
  gap_score: number;
  confidence_label: ConfidenceLabel;
  verdict_label: VerdictLabel;
};

export type EvidenceRow = {
  district_name: string;
  state: string;
  specialty: string;
  facility_id: string;
  facility_name: string;
  facility_type: string | null;
  city: string | null;
  pin_code: string | null;
  latitude: number | null;
  longitude: number | null;
  source_url: string | null;
  claim_id: string;
  source_field: string;
  claim_text: string;
};

export type DemandDetail = {
  district_name: string;
  state: string;
  demand_score: number;
  population: number | null;
  demand_quality_label: string;
  usable_indicator_count: number;
  low_sample_indicator_count: number;
  suppressed_indicator_count: number;
};

export type ScenarioRow = {
  scenario_id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  specialty: string;
  geo_filter_json: string;
  notes: string;
};

// View state
export type GeoLevel = 'national' | 'state' | 'district';
export type ViewState = { level: GeoLevel; state: string | null; district: string | null };

export function districtKey(state: string, district: string, specialty?: string): string {
  return `${state}::${district}${specialty ? `::${specialty}` : ''}`;
}
