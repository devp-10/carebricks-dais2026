SELECT
  specialty,
  display_name,
  facility_count
FROM medical_desert_planner.silver.specialty_vocabulary
WHERE is_app_selectable = true
ORDER BY facility_count DESC, specialty
