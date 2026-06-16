# Databricks notebook source
# Medical Desert Planner - medallion build
#
# This notebook materializes the final source-of-truth catalog for the app.
# It is intentionally deterministic. AI enrichment can be added as a separate
# checkpointed step after these baseline tables validate.

dbutils.widgets.text("catalog", "medical_desert_planner")
dbutils.widgets.text("source_schema", "databricks_virtue_foundation_dataset_dais_2026.virtue_foundation_dataset")
dbutils.widgets.text("population_schema", "medical_desert_gold.external_data")

CATALOG = dbutils.widgets.get("catalog")
SRC = dbutils.widgets.get("source_schema")
POP_SRC = dbutils.widgets.get("population_schema")


def run(sql: str) -> None:
    spark.sql(sql)


# COMMAND ----------

for schema in ["bronze", "silver", "gold", "app"]:
    run(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.{schema}")


# COMMAND ----------
# Bronze: copy provided sources as-is into final catalog.

run(f"""
CREATE OR REPLACE TABLE {CATALOG}.bronze.facilities AS
SELECT * FROM {SRC}.facilities
""")

run(f"""
CREATE OR REPLACE TABLE {CATALOG}.bronze.india_post_pincode_directory AS
SELECT * FROM {SRC}.india_post_pincode_directory
""")

run(f"""
CREATE OR REPLACE TABLE {CATALOG}.bronze.nfhs_5_district_health_indicators AS
SELECT * FROM {SRC}.nfhs_5_district_health_indicators
""")

run(f"""
CREATE OR REPLACE TABLE {CATALOG}.bronze.district_population AS
SELECT * FROM {POP_SRC}.district_population
""")

run(f"""
CREATE OR REPLACE TABLE {CATALOG}.bronze.state_population AS
SELECT * FROM {POP_SRC}.state_population
""")


# COMMAND ----------
# Silver: one row per PIN with modal district/state and ambiguity metrics.

run(f"""
CREATE OR REPLACE TABLE {CATALOG}.silver.geo_lookup_pin AS
WITH normalized AS (
  SELECT
    lpad(cast(pincode AS string), 6, '0') AS pin_code,
    initcap(lower(trim(district))) AS district_raw,
    initcap(lower(trim(statename))) AS state_raw,
    try_cast(nullif(latitude, 'NA') AS double) AS latitude,
    try_cast(nullif(longitude, 'NA') AS double) AS longitude
  FROM {CATALOG}.bronze.india_post_pincode_directory
),
pin_totals AS (
  SELECT
    pin_code,
    count(*) AS n_post_offices,
    count(DISTINCT district_raw) AS n_districts,
    count(DISTINCT state_raw) AS n_states,
    avg(latitude) AS centroid_latitude,
    avg(longitude) AS centroid_longitude
  FROM normalized
  GROUP BY pin_code
),
district_mode AS (
  SELECT
    pin_code,
    district_raw,
    count(*) AS district_n,
    row_number() OVER (PARTITION BY pin_code ORDER BY count(*) DESC, district_raw) AS rn
  FROM normalized
  GROUP BY pin_code, district_raw
),
state_mode AS (
  SELECT
    pin_code,
    state_raw,
    count(*) AS state_n,
    row_number() OVER (PARTITION BY pin_code ORDER BY count(*) DESC, state_raw) AS rn
  FROM normalized
  GROUP BY pin_code, state_raw
)
SELECT
  t.pin_code,
  d.district_raw,
  s.state_raw,
  cast(t.n_post_offices AS int) AS n_post_offices,
  cast(t.n_districts AS int) AS n_districts,
  cast(t.n_states AS int) AS n_states,
  d.district_n / t.n_post_offices AS district_agreement_pct,
  s.state_n / t.n_post_offices AS state_agreement_pct,
  t.centroid_latitude,
  t.centroid_longitude,
  current_timestamp() AS created_at
FROM pin_totals t
JOIN district_mode d ON t.pin_code = d.pin_code AND d.rn = 1
JOIN state_mode s ON t.pin_code = s.pin_code AND s.rn = 1
""")


# COMMAND ----------
# Silver: hand-curated district aliases. Preserve if already created.

run(f"""
CREATE TABLE IF NOT EXISTS {CATALOG}.silver.district_alias_map (
  district_raw STRING,
  state_raw STRING,
  district_nfhs5 STRING,
  state_nfhs5 STRING,
  match_status STRING,
  reviewed_by STRING,
  reviewed_at TIMESTAMP,
  note STRING
) USING DELTA
""")


# COMMAND ----------
# Silver: clean NFHS-5 to long indicator table with quality flags.

run(f"""
CREATE OR REPLACE TABLE {CATALOG}.silver.nfhs5_clean AS
WITH src AS (
  SELECT
    trim(district_name) AS district_nfhs5,
    trim(state_ut) AS state_nfhs5,
    stack(
      12,
      'institutional_birth_5y_pct', cast(institutional_birth_5y_pct AS string), 'low_is_need',
      'institutional_birth_in_public_facility_5y_pct', cast(institutional_birth_in_public_facility_5y_pct AS string), 'low_is_need',
      'hh_member_covered_health_insurance_pct', cast(hh_member_covered_health_insurance_pct AS string), 'low_is_need',
      'population_below_age_15_years_pct', cast(population_below_age_15_years_pct AS string), 'high_is_need',
      'fp_unmet_total_cm_w15_49_7_pct', cast(fp_unmet_total_cm_w15_49_7_pct AS string), 'high_is_need',
      'hh_electricity_pct', cast(hh_electricity_pct AS string), 'low_is_need',
      'hh_improved_water_pct', cast(hh_improved_water_pct AS string), 'low_is_need',
      'hh_use_improved_sanitation_pct', cast(hh_use_improved_sanitation_pct AS string), 'low_is_need',
      'households_using_clean_fuel_for_cooking_pct', cast(households_using_clean_fuel_for_cooking_pct AS string), 'low_is_need',
      'all_w15_49_who_are_anaemic_pct', cast(all_w15_49_who_are_anaemic_pct AS string), 'high_is_need',
      'women_age_30_49_years_ever_undergone_a_cervical_screen_pct', cast(women_age_30_49_years_ever_undergone_a_cervical_screen_pct AS string), 'low_is_need',
      'women_age_30_49_years_ever_undergone_a_breast_exam_pct', cast(women_age_30_49_years_ever_undergone_a_breast_exam_pct AS string), 'low_is_need'
    ) AS (indicator_name, raw_value, direction_for_need)
  FROM {CATALOG}.bronze.nfhs_5_district_health_indicators
)
SELECT
  district_nfhs5,
  state_nfhs5,
  indicator_name,
  indicator_name AS source_column,
  CASE
    WHEN trim(raw_value) = '*' THEN NULL
    ELSE try_cast(regexp_replace(regexp_replace(trim(raw_value), '^\\\\(', ''), '\\\\)$', '') AS double)
  END AS numeric_value,
  raw_value,
  trim(raw_value) = '*' AS is_suppressed,
  trim(raw_value) LIKE '(%)' AS is_low_sample,
  direction_for_need,
  current_timestamp() AS created_at
FROM src
""")


# COMMAND ----------
# Silver: cleaned population tables. District names are not fully aligned to NFHS-5,
# so this is exact-match only for now and carried with an explicit match method.

run(f"""
CREATE OR REPLACE TABLE {CATALOG}.silver.district_population_clean AS
SELECT
  trim(District) AS district_raw,
  trim(State) AS state_raw,
  try_cast(regexp_replace(Population, ',', '') AS bigint) AS population,
  try_cast(regexp_replace(Growth, '%', '') AS double) AS growth_pct,
  try_cast(`Sex-Ratio` AS int) AS sex_ratio,
  try_cast(Literacy AS double) AS literacy_pct,
  current_timestamp() AS created_at
FROM {CATALOG}.bronze.district_population
""")

run(f"""
CREATE OR REPLACE TABLE {CATALOG}.silver.state_population_clean AS
SELECT
  trim(state_ut_name) AS state_nfhs5,
  type,
  population_millions,
  current_timestamp() AS created_at
FROM {CATALOG}.bronze.state_population
""")


# COMMAND ----------
# Silver: cleaned facilities with resolved geography.

run(f"""
CREATE OR REPLACE TABLE {CATALOG}.silver.facilities_clean AS
WITH raw_clean AS (
  SELECT *
  FROM {CATALOG}.bronze.facilities
  WHERE unique_id RLIKE '^[0-9a-f]{{8}}-[0-9a-f]{{4}}-[0-9a-f]{{4}}-[0-9a-f]{{4}}-[0-9a-f]{{12}}$'
),
dup AS (
  SELECT cluster_id
  FROM raw_clean
  WHERE cluster_id IS NOT NULL AND lower(trim(cluster_id)) <> 'null'
  GROUP BY cluster_id
  HAVING count(*) > 1
),
nfhs_keys AS (
  SELECT DISTINCT
    lower(trim(district_name)) AS district_key,
    lower(trim(state_ut)) AS state_key,
    trim(district_name) AS district_nfhs5,
    trim(state_ut) AS state_nfhs5
  FROM {CATALOG}.bronze.nfhs_5_district_health_indicators
),
base AS (
  SELECT
    r.*,
    CASE
      WHEN address_zipOrPostcode RLIKE '^[0-9]{{6}}$' THEN address_zipOrPostcode
      ELSE NULL
    END AS pin_code_clean,
    CASE
      WHEN latitude BETWEEN 6 AND 38 AND longitude BETWEEN 68 AND 98 THEN latitude
      ELSE NULL
    END AS latitude_clean,
    CASE
      WHEN latitude BETWEEN 6 AND 38 AND longitude BETWEEN 68 AND 98 THEN longitude
      ELSE NULL
    END AS longitude_clean
  FROM raw_clean r
)
SELECT
  b.unique_id AS facility_id,
  nullif(trim(b.name), '') AS name,
  nullif(trim(b.organization_type), '') AS organization_type,
  CASE
    WHEN lower(trim(b.facilityTypeId)) IN ('', 'null') THEN NULL
    WHEN lower(trim(b.facilityTypeId)) = 'farmacy' THEN 'pharmacy'
    ELSE lower(trim(b.facilityTypeId))
  END AS facility_type,
  CASE
    WHEN lower(trim(b.operatorTypeId)) IN ('', 'null') THEN NULL
    WHEN lower(trim(b.operatorTypeId)) = 'government' THEN 'public'
    ELSE lower(trim(b.operatorTypeId))
  END AS operator_type,
  nullif(trim(b.address_line1), '') AS address_line1,
  nullif(trim(b.address_line2), '') AS address_line2,
  nullif(trim(b.address_city), '') AS address_city_raw,
  nullif(trim(b.address_stateOrRegion), '') AS address_state_raw,
  b.pin_code_clean AS pin_code,
  b.latitude_clean AS latitude,
  b.longitude_clean AS longitude,
  g.district_raw,
  g.state_raw,
  coalesce(a.district_nfhs5, n.district_nfhs5, 'Unresolved') AS district_nfhs5,
  coalesce(a.state_nfhs5, n.state_nfhs5, 'Unresolved') AS state_nfhs5,
  CASE
    WHEN a.district_nfhs5 IS NOT NULL THEN 'pincode_alias'
    WHEN n.district_nfhs5 IS NOT NULL THEN 'pincode_exact'
    WHEN g.pin_code IS NOT NULL THEN 'pincode_unmatched'
    ELSE 'unresolved'
  END AS geo_match_method,
  CASE
    WHEN a.district_nfhs5 IS NOT NULL OR n.district_nfhs5 IS NOT NULL THEN 'high'
    WHEN g.pin_code IS NOT NULL THEN 'medium'
    ELSE 'low'
  END AS geo_confidence,
  array_distinct(coalesce(from_json(b.specialties, 'array<string>'), array())) AS specialties,
  CASE WHEN lower(trim(b.numberDoctors)) IN ('', 'null') THEN NULL ELSE try_cast(b.numberDoctors AS int) END AS number_doctors,
  CASE WHEN lower(trim(b.capacity)) IN ('', 'null') THEN NULL ELSE try_cast(b.capacity AS int) END AS capacity,
  CASE WHEN lower(trim(b.yearEstablished)) IN ('', 'null') THEN NULL ELSE try_cast(b.yearEstablished AS int) END AS year_established,
  b.description,
  b.source_urls,
  b.cluster_id,
  d.cluster_id IS NOT NULL AS is_likely_duplicate,
  current_timestamp() AS created_at
FROM base b
LEFT JOIN {CATALOG}.silver.geo_lookup_pin g ON b.pin_code_clean = g.pin_code
LEFT JOIN {CATALOG}.silver.district_alias_map a
  ON lower(g.district_raw) = lower(a.district_raw)
 AND lower(g.state_raw) = lower(a.state_raw)
LEFT JOIN nfhs_keys n
  ON lower(g.district_raw) = n.district_key
 AND lower(g.state_raw) = n.state_key
LEFT JOIN dup d ON b.cluster_id = d.cluster_id
""")


# COMMAND ----------
# Silver: verbatim claims. Baseline uses structured specialties plus deterministic rules.

run(f"""
CREATE OR REPLACE TABLE {CATALOG}.silver.facility_claims AS
WITH spec_claims AS (
  SELECT
    facility_id,
    'specialties' AS source_field,
    spec AS claim_text,
    'structured_specialty' AS claim_category,
    spec AS specialty_tag,
    'structured' AS extraction_method,
    1.0 AS extraction_confidence,
    cast(NULL AS string) AS source_url,
    false AS is_noise
  FROM {CATALOG}.silver.facilities_clean
  LATERAL VIEW explode(specialties) e AS spec
  WHERE spec IS NOT NULL AND trim(spec) <> ''
),
raw_arrays AS (
  SELECT unique_id AS facility_id, 'capability' AS source_field, claim_text
  FROM {CATALOG}.bronze.facilities
  LATERAL VIEW explode(coalesce(from_json(capability, 'array<string>'), array())) e AS claim_text
  WHERE unique_id RLIKE '^[0-9a-f]{{8}}-[0-9a-f]{{4}}-[0-9a-f]{{4}}-[0-9a-f]{{4}}-[0-9a-f]{{12}}$'
  UNION ALL
  SELECT unique_id AS facility_id, 'procedure' AS source_field, claim_text
  FROM {CATALOG}.bronze.facilities
  LATERAL VIEW explode(coalesce(from_json(procedure, 'array<string>'), array())) e AS claim_text
  WHERE unique_id RLIKE '^[0-9a-f]{{8}}-[0-9a-f]{{4}}-[0-9a-f]{{4}}-[0-9a-f]{{4}}-[0-9a-f]{{12}}$'
  UNION ALL
  SELECT unique_id AS facility_id, 'equipment' AS source_field, claim_text
  FROM {CATALOG}.bronze.facilities
  LATERAL VIEW explode(coalesce(from_json(equipment, 'array<string>'), array())) e AS claim_text
  WHERE unique_id RLIKE '^[0-9a-f]{{8}}-[0-9a-f]{{4}}-[0-9a-f]{{4}}-[0-9a-f]{{4}}-[0-9a-f]{{12}}$'
),
description_claims AS (
  SELECT
    unique_id AS facility_id,
    'description' AS source_field,
    description AS claim_text
  FROM {CATALOG}.bronze.facilities
  WHERE unique_id RLIKE '^[0-9a-f]{{8}}-[0-9a-f]{{4}}-[0-9a-f]{{4}}-[0-9a-f]{{4}}-[0-9a-f]{{12}}$'
    AND description IS NOT NULL
    AND lower(description) RLIKE 'volunteer|charity|ngo|mission|non profit|nonprofit|free camp|medical camp'
),
classified AS (
  SELECT
    facility_id,
    source_field,
    claim_text,
    CASE
      WHEN lower(claim_text) RLIKE 'listed as|appears on|map labeled|registration no|member of .*association|parking|wifi|canteen' THEN 'noise'
      WHEN lower(claim_text) RLIKE 'volunteer|charity|ngo|mission|non profit|nonprofit|free camp|medical camp' THEN 'volunteer_mission_signal'
      WHEN source_field = 'equipment' THEN 'equipment'
      WHEN source_field = 'procedure' THEN 'procedure'
      WHEN lower(claim_text) RLIKE 'nabh|iso|accredit' THEN 'accreditation'
      WHEN lower(claim_text) RLIKE 'doctor|staff|surgeon|consultant|specialist' THEN 'staffing'
      ELSE 'clinical_capability'
    END AS claim_category
  FROM (
    SELECT * FROM raw_arrays
    UNION ALL
    SELECT * FROM description_claims
  )
  WHERE claim_text IS NOT NULL AND trim(claim_text) <> ''
),
free_text_claims AS (
  SELECT
    c.facility_id,
    c.source_field,
    c.claim_text,
    c.claim_category,
    cast(NULL AS string) AS specialty_tag,
    'rule' AS extraction_method,
    CASE WHEN c.claim_category = 'noise' THEN 0.4 ELSE 0.7 END AS extraction_confidence,
    cast(NULL AS string) AS source_url,
    c.claim_category = 'noise' AS is_noise
  FROM classified c
)
SELECT
  sha2(concat_ws('|', facility_id, source_field, claim_text, coalesce(specialty_tag, '')), 256) AS claim_id,
  facility_id,
  source_field,
  claim_text,
  claim_category,
  specialty_tag,
  extraction_method,
  extraction_confidence,
  source_url,
  is_noise,
  current_timestamp() AS created_at
FROM (
  SELECT * FROM spec_claims
  UNION ALL
  SELECT * FROM free_text_claims
)
""")


# COMMAND ----------
# Silver: app-selectable specialty vocabulary. Keep raw claims, but only promote
# canonical-ish specialty tokens with enough support into Gold/app filters.

run(f"""
CREATE OR REPLACE TABLE {CATALOG}.silver.specialty_vocabulary AS
WITH counts AS (
  SELECT
    specialty_tag AS specialty,
    count(DISTINCT facility_id) AS facility_count
  FROM {CATALOG}.silver.facility_claims
  WHERE source_field = 'specialties'
    AND specialty_tag IS NOT NULL
    AND specialty_tag RLIKE '^[a-z][A-Za-z0-9]+$'
  GROUP BY specialty_tag
)
SELECT
  specialty,
  initcap(regexp_replace(regexp_replace(specialty, '([a-z])([A-Z])', '$1 $2'), 'And', 'and')) AS display_name,
  cast(facility_count AS int) AS facility_count,
  facility_count >= 500 AS is_app_selectable,
  current_timestamp() AS created_at
FROM counts
""")


# COMMAND ----------
# Gold: district demand scores.

run(f"""
CREATE OR REPLACE TABLE {CATALOG}.gold.district_demand_scores AS
WITH scored AS (
  SELECT
    district_nfhs5,
    state_nfhs5,
    indicator_name,
    numeric_value,
    is_suppressed,
    is_low_sample,
    direction_for_need,
    CASE
      WHEN numeric_value IS NULL THEN NULL
      WHEN direction_for_need = 'low_is_need' THEN 100.0 - numeric_value
      ELSE numeric_value
    END AS need_component
  FROM {CATALOG}.silver.nfhs5_clean
),
agg AS (
  SELECT
    district_nfhs5,
    state_nfhs5,
    avg(need_component) AS raw_demand_score,
    count(need_component) AS usable_indicator_count,
    sum(CASE WHEN is_low_sample THEN 1 ELSE 0 END) AS low_sample_indicator_count,
    sum(CASE WHEN is_suppressed THEN 1 ELSE 0 END) AS suppressed_indicator_count
  FROM scored
  GROUP BY district_nfhs5, state_nfhs5
),
pop AS (
  SELECT
    lower(trim(district_raw)) AS district_key,
    lower(trim(state_raw)) AS state_key,
    population
  FROM {CATALOG}.silver.district_population_clean
),
with_pop AS (
  SELECT
    a.*,
    p.population,
    CASE WHEN p.population IS NOT NULL THEN 'district_exact' ELSE 'unmatched' END AS population_match_method
  FROM agg a
  LEFT JOIN pop p
    ON lower(a.district_nfhs5) = p.district_key
   AND lower(a.state_nfhs5) = p.state_key
),
ranked AS (
  SELECT
    *,
    100.0 * percent_rank() OVER (ORDER BY raw_demand_score) AS demand_score
  FROM with_pop
)
SELECT
  district_nfhs5,
  state_nfhs5,
  raw_demand_score,
  demand_score,
  population,
  population_match_method,
  cast(usable_indicator_count AS int) AS usable_indicator_count,
  cast(low_sample_indicator_count AS int) AS low_sample_indicator_count,
  cast(suppressed_indicator_count AS int) AS suppressed_indicator_count,
  CASE
    WHEN usable_indicator_count < 4 THEN 'insufficient'
    WHEN low_sample_indicator_count > usable_indicator_count / 2 THEN 'low_sample_heavy'
    ELSE 'usable'
  END AS demand_quality_label,
  concat(
    'Demand score averages ', cast(usable_indicator_count AS string),
    ' usable NFHS-5 indicators; suppressed=', cast(suppressed_indicator_count AS string),
    ', low_sample=', cast(low_sample_indicator_count AS string)
  ) AS demand_explanation,
  current_timestamp() AS created_at
FROM ranked
""")


# COMMAND ----------
# Gold: district x specialty capability scores.

run(f"""
CREATE OR REPLACE TABLE {CATALOG}.gold.district_capability_scores AS
WITH district_base AS (
  SELECT
    state_nfhs5,
    district_nfhs5,
    count(DISTINCT facility_id) AS n_facilities
  FROM {CATALOG}.silver.facilities_clean
  GROUP BY state_nfhs5, district_nfhs5
),
facility_specialty AS (
  SELECT DISTINCT
    exploded.state_nfhs5,
    exploded.district_nfhs5,
    exploded.facility_id,
    exploded.spec AS specialty
  FROM (
    SELECT
      f.state_nfhs5,
      f.district_nfhs5,
      f.facility_id,
      spec
    FROM {CATALOG}.silver.facilities_clean f
    LATERAL VIEW explode(f.specialties) e AS spec
    WHERE spec IS NOT NULL AND trim(spec) <> ''
  ) exploded
  JOIN {CATALOG}.silver.specialty_vocabulary v
    ON exploded.spec = v.specialty
   AND v.is_app_selectable = true
),
specialty_counts AS (
  SELECT
    state_nfhs5,
    district_nfhs5,
    specialty,
    count(DISTINCT facility_id) AS k_facilities
  FROM facility_specialty
  GROUP BY state_nfhs5, district_nfhs5, specialty
),
claim_counts AS (
  SELECT
    f.state_nfhs5,
    f.district_nfhs5,
    c.specialty_tag AS specialty,
    count(*) AS claim_count
  FROM {CATALOG}.silver.facility_claims c
  JOIN {CATALOG}.silver.facilities_clean f ON c.facility_id = f.facility_id
  JOIN {CATALOG}.silver.specialty_vocabulary v
    ON c.specialty_tag = v.specialty
   AND v.is_app_selectable = true
  WHERE c.specialty_tag IS NOT NULL AND c.is_noise = false
  GROUP BY f.state_nfhs5, f.district_nfhs5, c.specialty_tag
),
base AS (
  SELECT
    sc.state_nfhs5,
    sc.district_nfhs5,
    sc.specialty,
    db.n_facilities,
    sc.k_facilities,
    coalesce(cc.claim_count, 0) AS claim_count,
    sc.k_facilities / db.n_facilities AS p_hat,
    d.demand_score,
    d.demand_quality_label
  FROM specialty_counts sc
  JOIN district_base db
    ON sc.state_nfhs5 = db.state_nfhs5
   AND sc.district_nfhs5 = db.district_nfhs5
  LEFT JOIN claim_counts cc
    ON sc.state_nfhs5 = cc.state_nfhs5
   AND sc.district_nfhs5 = cc.district_nfhs5
   AND sc.specialty = cc.specialty
  LEFT JOIN {CATALOG}.gold.district_demand_scores d
    ON sc.state_nfhs5 = d.state_nfhs5
   AND sc.district_nfhs5 = d.district_nfhs5
),
wilson AS (
  SELECT
    *,
    1.96 AS z,
    (p_hat + pow(1.96, 2) / (2 * n_facilities)) / (1 + pow(1.96, 2) / n_facilities) AS center,
    1.96 * sqrt((p_hat * (1 - p_hat) / n_facilities) + pow(1.96, 2) / (4 * pow(n_facilities, 2))) / (1 + pow(1.96, 2) / n_facilities) AS half_width
  FROM base
)
SELECT
  district_nfhs5,
  state_nfhs5,
  specialty,
  cast(n_facilities AS int) AS n_facilities,
  cast(k_facilities AS int) AS k_facilities,
  cast(claim_count AS int) AS claim_count,
  p_hat AS documented_supply_rate,
  greatest(0.0, center - half_width) AS wilson_lo,
  least(1.0, center + half_width) AS wilson_hi,
  demand_score,
  CASE
    WHEN demand_score IS NULL THEN NULL
    ELSE demand_score * (1.0 - least(1.0, center + half_width))
  END AS gap_score,
  CASE
    WHEN district_nfhs5 = 'Unresolved' OR n_facilities < 5 OR (2 * half_width) > 0.5 THEN 'data_poor'
    WHEN demand_quality_label <> 'usable' THEN 'demand_uncertain'
    ELSE 'sufficient_evidence'
  END AS confidence_label,
  CASE
    WHEN demand_score >= 60 AND (district_nfhs5 = 'Unresolved' OR n_facilities < 5 OR (2 * half_width) > 0.5) THEN 'data_poor_high_need'
    WHEN demand_score >= 60 AND p_hat < 0.2 AND n_facilities >= 5 THEN 'likely_real_gap'
    WHEN demand_score >= 60 THEN 'mixed_evidence'
    ELSE 'lower_priority'
  END AS verdict_label,
  current_timestamp() AS created_at
FROM wilson
""")


# COMMAND ----------
# Gold: evidence rows to power drill-down citations.

run(f"""
CREATE OR REPLACE TABLE {CATALOG}.gold.district_facility_evidence AS
SELECT
  sha2(concat_ws('|', f.state_nfhs5, f.district_nfhs5, c.specialty_tag, f.facility_id, c.claim_id), 256) AS evidence_id,
  f.district_nfhs5,
  f.state_nfhs5,
  c.specialty_tag AS specialty,
  f.facility_id,
  c.claim_id,
  c.claim_text,
  c.source_field,
  c.source_url
FROM {CATALOG}.silver.facility_claims c
JOIN {CATALOG}.silver.facilities_clean f ON c.facility_id = f.facility_id
JOIN {CATALOG}.silver.specialty_vocabulary v
  ON c.specialty_tag = v.specialty
 AND v.is_app_selectable = true
WHERE c.specialty_tag IS NOT NULL
  AND c.is_noise = false
""")


# COMMAND ----------
# App persistence tables.

run(f"""
CREATE TABLE IF NOT EXISTS {CATALOG}.app.planning_scenarios (
  scenario_id STRING,
  name STRING,
  created_by STRING,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  specialty STRING,
  geo_filter_json STRING,
  notes STRING
) USING DELTA
""")

run(f"""
CREATE TABLE IF NOT EXISTS {CATALOG}.app.shortlist_items (
  scenario_id STRING,
  facility_id STRING,
  added_at TIMESTAMP,
  note STRING
) USING DELTA
""")

run(f"""
CREATE TABLE IF NOT EXISTS {CATALOG}.app.claim_reviews (
  review_id STRING,
  scenario_id STRING,
  claim_id STRING,
  facility_id STRING,
  review_status STRING,
  reviewer STRING,
  reviewed_at TIMESTAMP,
  note STRING
) USING DELTA
""")
