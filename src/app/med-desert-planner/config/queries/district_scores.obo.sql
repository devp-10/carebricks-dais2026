-- @param specialty STRING
-- @param state STRING
-- @param verdict STRING
WITH filtered AS (
  SELECT *
  FROM medical_desert_planner.gold.district_capability_scores
  WHERE (:specialty = 'All capabilities' OR specialty = :specialty)
    AND (:state = 'All states' OR state_nfhs5 = :state)
    AND (:verdict = 'All verdicts' OR verdict_label = :verdict)
),
ranked AS (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY state_nfhs5, district_nfhs5
      ORDER BY gap_score DESC, demand_score DESC, specialty
    ) AS district_rank
  FROM filtered
)
SELECT
  district_nfhs5 AS district_name,
  state_nfhs5 AS state,
  specialty,
  CAST(demand_score AS DOUBLE) AS demand_score,
  CAST(NULL AS DOUBLE) AS raw_demand_score,
  CASE
    WHEN demand_score >= 75 THEN 'high_need'
    WHEN demand_score >= 50 THEN 'moderate_need'
    ELSE 'lower_need'
  END AS demand_label,
  confidence_label AS demand_evidence_label,
  CAST(n_facilities AS INT) AS n_facilities,
  CAST(k_facilities AS INT) AS k_facilities,
  CAST(claim_count AS INT) AS claim_count,
  CAST(documented_supply_rate AS DOUBLE) AS documented_supply_rate,
  CAST(wilson_lo AS DOUBLE) AS wilson_lo,
  CAST(wilson_hi AS DOUBLE) AS wilson_hi,
  CAST(gap_score AS DOUBLE) AS gap_score,
  confidence_label,
  verdict_label
FROM ranked
WHERE (:specialty <> 'All capabilities' OR district_rank = 1)
ORDER BY gap_score DESC, demand_score DESC, district_name
LIMIT 750
