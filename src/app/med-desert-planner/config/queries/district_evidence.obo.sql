-- @param specialty STRING
-- @param state STRING
-- @param district STRING
SELECT
  e.district_nfhs5 AS district_name,
  e.state_nfhs5 AS state,
  e.specialty,
  e.facility_id,
  f.name AS facility_name,
  f.facility_type,
  f.address_city_raw AS city,
  f.pin_code,
  CAST(f.latitude AS DOUBLE) AS latitude,
  CAST(f.longitude AS DOUBLE) AS longitude,
  COALESCE(e.source_url, f.source_urls) AS source_url,
  e.claim_id,
  e.source_field,
  e.claim_text
FROM medical_desert_planner.gold.district_facility_evidence e
LEFT JOIN medical_desert_planner.silver.facilities_clean f
  ON e.facility_id = f.facility_id
WHERE e.specialty = :specialty
  AND e.state_nfhs5 = :state
  AND e.district_nfhs5 = :district
ORDER BY facility_name, e.source_field, e.claim_id
LIMIT 200
