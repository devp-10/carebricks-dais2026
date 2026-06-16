-- @param state STRING
-- @param district STRING
SELECT
  district_nfhs5 AS district_name,
  state_nfhs5 AS state,
  CAST(demand_score AS DOUBLE) AS demand_score,
  CAST(population AS BIGINT) AS population,
  demand_quality_label,
  CAST(usable_indicator_count AS INT) AS usable_indicator_count,
  CAST(low_sample_indicator_count AS INT) AS low_sample_indicator_count,
  CAST(suppressed_indicator_count AS INT) AS suppressed_indicator_count
FROM medical_desert_planner.gold.district_demand_scores
WHERE state_nfhs5 = :state AND district_nfhs5 = :district
LIMIT 1
