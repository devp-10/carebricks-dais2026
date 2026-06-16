-- @param specialty STRING
-- @param state STRING
-- @param verdict STRING
WITH filtered AS (
  SELECT *
  FROM medical_desert_planner.gold.district_capability_scores
  WHERE (:specialty = 'All capabilities' OR array_contains(split(:specialty, '\\|'), specialty))
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
),
demand_pop AS (
  SELECT
    state_nfhs5,
    district_nfhs5,
    MAX(population) AS population
  FROM medical_desert_planner.gold.district_demand_scores
  GROUP BY state_nfhs5, district_nfhs5
)
SELECT
  r.district_nfhs5 AS district_name,
  r.state_nfhs5 AS state,
  r.specialty,
  CAST(r.demand_score AS DOUBLE) AS demand_score,
  CAST(NULL AS DOUBLE) AS raw_demand_score,
  CASE
    WHEN r.demand_score >= 75 THEN 'high_need'
    WHEN r.demand_score >= 50 THEN 'moderate_need'
    ELSE 'lower_need'
  END AS demand_label,
  r.confidence_label AS demand_evidence_label,
  CAST(p.population AS BIGINT) AS population,
  CAST(r.n_facilities AS INT) AS n_facilities,
  CAST(r.k_facilities AS INT) AS k_facilities,
  CAST(r.claim_count AS INT) AS claim_count,
  CAST(r.documented_supply_rate AS DOUBLE) AS documented_supply_rate,
  CAST(r.wilson_lo AS DOUBLE) AS wilson_lo,
  CAST(r.wilson_hi AS DOUBLE) AS wilson_hi,
  CAST(r.gap_score AS DOUBLE) AS gap_score,
  r.confidence_label,
  r.verdict_label
FROM ranked r
LEFT JOIN demand_pop p
  ON p.state_nfhs5 = r.state_nfhs5 AND p.district_nfhs5 = r.district_nfhs5
WHERE (:specialty <> 'All capabilities' OR r.district_rank = 1)
ORDER BY r.gap_score DESC, r.demand_score DESC, district_name
LIMIT 750
