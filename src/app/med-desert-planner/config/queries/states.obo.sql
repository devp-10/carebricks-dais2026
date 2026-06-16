SELECT DISTINCT
  state_nfhs5 AS state
FROM medical_desert_planner.gold.district_capability_scores
WHERE state_nfhs5 IS NOT NULL
ORDER BY state
