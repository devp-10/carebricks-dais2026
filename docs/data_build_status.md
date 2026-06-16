# Data Build Status

Last successful Databricks run: 2026-06-15.

Run URL:
`https://dbc-4867de6d-7479.cloud.databricks.com/?o=7474654394955490#job/131278431995639/run/835276913394205`

## Deployed Build

- Catalog: `medical_desert_planner`
- Schemas: `bronze`, `silver`, `gold`, `app`
- Bundle: `medical-desert-planner`
- Job resource: `medallion_build`
- Notebook: `src/notebooks/01_build_medallion.py`

## Row Counts

| Table | Rows |
|---|---:|
| `bronze.facilities` | 10,088 |
| `bronze.india_post_pincode_directory` | 165,627 |
| `bronze.nfhs_5_district_health_indicators` | 706 |
| `bronze.district_population` | 610 |
| `silver.facilities_clean` | 10,000 |
| `silver.geo_lookup_pin` | 19,586 |
| `silver.facility_claims` | 570,185 |
| `silver.specialty_vocabulary` | 2,106 total / 48 app-selectable |
| `gold.district_demand_scores` | 706 |
| `gold.district_capability_scores` | 10,350 |
| `gold.district_facility_evidence` | 92,642 |

## Geography Resolution

| Method | Confidence | Facilities |
|---|---|---:|
| `pincode_exact` | high | 6,141 |
| `pincode_unmatched` | medium | 3,427 |
| `unresolved` | low | 432 |

## Gold Verdict Distribution

| Confidence | Verdict | Rows |
|---|---|---:|
| `sufficient_evidence` | `lower_priority` | 4,736 |
| `data_poor` | `lower_priority` | 2,651 |
| `data_poor` | `data_poor_high_need` | 1,883 |
| `sufficient_evidence` | `likely_real_gap` | 672 |
| `sufficient_evidence` | `mixed_evidence` | 408 |

## AI Enrichment Status

The current medallion build is deterministic. It does not use `ai_query`, `ai_extract`,
Genie, or Vector Search.

The next optional data checkpoint can add `ai_query` to classify free-text `capability`,
`procedure`, and `equipment` claims against the 48 app-selectable specialties. That should
be a separate dry-run-first job, not part of the live app path.
