SELECT
  scenario_id,
  name,
  created_by,
  created_at,
  updated_at,
  specialty,
  geo_filter_json,
  notes
FROM medical_desert_planner.app.planning_scenarios
ORDER BY updated_at DESC
LIMIT 30
