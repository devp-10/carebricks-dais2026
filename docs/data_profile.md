# Data Profile - Medical Desert Planner

Profiled live through Unity Catalog on 2026-06-15 using Databricks profile
`dbx-codex-auth` and SQL warehouse `76ed2f6ff2ff98a7`.

## Confirmed Source Tables

| Dataset | Confirmed table | Rows | Columns | Notes |
|---|---|---:|---:|---|
| Facilities | `databricks_virtue_foundation_dataset_dais_2026.virtue_foundation_dataset.facilities` | 10,088 | 51 | Provided facility dataset. Use as source of truth. |
| India Post PIN directory | `databricks_virtue_foundation_dataset_dais_2026.virtue_foundation_dataset.india_post_pincode_directory` | 165,627 | 11 | Post-office grain, not PIN grain. |
| NFHS-5 district indicators | `databricks_virtue_foundation_dataset_dais_2026.virtue_foundation_dataset.nfhs_5_district_health_indicators` | 706 | 110 | District health indicators; many string columns contain NFHS suppression markers. |

Existing derived tables also exist under `medical_desert_gold`, including
`medical_desert_gold.default.facilities_silver` and
`medical_desert_gold.facilities_enriched.facilities_it1`. I am not treating them as
architecture inputs because the task is to design from the provided source data.

## Facilities Reality

The facilities table has 10,088 rows, but only 10,000 have a valid UUID-shaped
`unique_id`. The remaining 88 rows are upstream parsing leakage: profile samples show
biography/markdown text shifted into columns such as `unique_id`, `name`, and
`facilityTypeId`. The silver layer should filter to:

```sql
unique_id RLIKE '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
```

On the 10,000 clean rows:

| Measure | Count | Rate |
|---|---:|---:|
| Coordinates inside rough India bbox (`lat 6..38`, `lon 68..98`) | 9,964 | 99.6% |
| Coordinates missing | 30 | 0.3% |
| Coordinates outside India bbox | 6 | 0.1% |
| Valid 6-digit PIN in `address_zipOrPostcode` | 9,772 | 97.7% |
| Source text mentioning volunteer/charity/NGO/mission/camp terms | 1,346 | 13.5% |

Important missingness issue: several fields use the literal string `"null"`, not SQL
NULL. True coverage after trimming and excluding `"null"`:

| Field | Usable values |
|---|---:|
| `numberDoctors` | 3,630 |
| `capacity` | 2,516 |
| `yearEstablished` | 4,782 |
| `acceptsVolunteers` | 21 total: 14 `true`, 7 `false` |

`acceptsVolunteers` is therefore not usable as a planning filter. Volunteer relevance
must be cited from free text.

## Facility Vocabulary

`specialties` is a JSON-like string array and is the cleanest capability vocabulary.
Counts below deduplicate repeated specialties within each facility:

| Specialty | Facilities |
|---|---:|
| `internalMedicine` | 6,836 |
| `familyMedicine` | 5,175 |
| `gynecologyAndObstetrics` | 4,489 |
| `dentistry` | 4,190 |
| `orthopedicSurgery` | 3,519 |
| `pediatrics` | 3,429 |
| `generalSurgery` | 3,191 |
| `cardiology` | 3,003 |
| `radiology` | 2,993 |
| `ophthalmology` | 2,823 |
| `otolaryngology` | 2,699 |
| `urology` | 2,624 |
| `gastroenterology` | 2,419 |
| `dermatology` | 2,328 |
| `pathology` | 2,248 |
| `nephrology` | 2,153 |
| `emergencyMedicine` | 2,079 |
| `neurology` | 1,958 |

`capability`, `procedure`, `equipment`, and `description` are evidence fields, not ground
truth. Examples from live samples:

- Description: "Offers consultations, day care services, and vaccinations."
- Capability: "NICU Level III"
- Capability: "24/7 Emergency Department"
- Procedure: "Offers CT scan for diagnostic imaging"
- Equipment: "Digital X-ray imaging system"
- Noise mixed into capability arrays: "Appears on Venmony map labeled as Sanjivani
  Multispeciality Hospital in Venmony, Kerala, India"

Conclusion: structured `specialties` should drive the primary non-technical selector;
free-text claims should be stored verbatim, classified, and shown as citations.

## Facility Type And Operator

Top clean-row combinations:

| Facility type | Operator | Count |
|---|---|---:|
| `hospital` | `private` | 4,674 |
| `clinic` | `private` | 3,627 |
| `hospital` | `"null"` string | 519 |
| `dentist` | `private` | 484 |
| `hospital` | `public` | 442 |
| `clinic` | `"null"` string | 129 |

Normalize `government` into `public`, and normalize the source typo `farmacy` into
`pharmacy`.

Duplicate signal is small: only 11 duplicate `cluster_id` groups, 22 rows total, max
cluster size 2. Mark duplicates, but do not spend the first build cycle on aggressive
deduplication.

## PIN Directory Reality

The PIN directory has 165,627 rows for 19,586 distinct PINs:

| Measure | Value |
|---|---:|
| Avg post offices per PIN | 8.46 |
| Max post offices per PIN | 153 |
| PINs with one district | 18,108 |
| PINs spanning multiple districts | 1,478 |
| PINs spanning multiple states | 290 |

This confirms the row grain is post office. Build a one-row-per-PIN lookup by choosing
the modal `(district, state)` pair and retaining ambiguity metrics.

## Geography Join Feasibility

NFHS-5 has 706 rows and 706 distinct `(state_ut, district_name)` keys after trim/lower,
but only 698 distinct district names because some names repeat across states. Nearly all
district names have outer whitespace in the source (`704/706`), so `trim()` is mandatory.

Exact match results:

| Join test | Exact matches |
|---|---:|
| All PIN modal `(district, state)` pairs to NFHS-5 | 13,963 / 19,586 PINs = 71.3% |
| Actual clean facility PINs to PIN directory | 9,568 / 10,000 facilities |
| Actual clean facilities resolved exactly to NFHS-5 via PIN modal `(district, state)` | 6,141 / 10,000 = 61.4% |
| Same, as share of valid facility PINs | 62.8% |

Implication: PIN is still the best starting key because facility coordinates and PIN
coverage are strong, but exact name matching is not enough. A district/state alias table
is not optional; it is a first build artifact. Unmatched records must remain visible as
`Unresolved Geography`, not dropped or silently guessed.

## NFHS-5 Indicator Reality

Relevant real column names for demand-side context:

- `institutional_birth_5y_pct`
- `institutional_birth_in_public_facility_5y_pct`
- `hh_member_covered_health_insurance_pct`
- `population_below_age_15_years_pct`
- `fp_unmet_total_cm_w15_49_7_pct`
- `hh_electricity_pct`
- `hh_improved_water_pct`
- `hh_use_improved_sanitation_pct`
- `households_using_clean_fuel_for_cooking_pct`
- `all_w15_49_who_are_anaemic_pct`
- `women_age_30_49_years_ever_undergone_a_cervical_screen_pct`
- `women_age_30_49_years_ever_undergone_a_breast_exam_pct`
- `women_age_30_49_years_ever_undergone_an_oral_cancer_exam_pct`

Special value conventions are present:

| Column | Suppressed `*` | Low-sample `(value)` |
|---|---:|---:|
| `child_12_23m_fully_vaccinated_based_on_information_from_eit_pct` | 13 | 232 |
| `children_born_at_home_who_were_taken_to_a_health_facility_f_pct` | 422 | 141 |
| `sex_ratio_at_birth_5y_f_per_1000_m` | 0 | 2 |

The demand layer must parse numeric strings, carry suppression/low-sample flags, and avoid
computing a confident demand score from mostly suppressed indicators.

## Architecture Implications

1. Treat facility text as claims with citations, not truth.
2. Use `specialties` as the primary planner-facing capability vocabulary.
3. Use PIN modal district/state plus aliases for district resolution; keep unresolved
   geography visible.
4. Separate "low documented supply" from "low evidence" using an uncertainty model.
5. Persist planner notes, shortlists, scenario saves, and claim reviews in app-owned
   tables.
