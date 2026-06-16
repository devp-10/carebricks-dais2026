# Geo assets

Source: geohacker/india (GADM-derived), simplified with mapshaper.

- `india_states.json` — India ADM1. Feature property `NAME_1` = state name. ~508 KB.
- `districts/<state-slug>.json` — ADM2 per state. Feature properties `NAME_1` (state),
  `NAME_2` (district). Filenames are slugs of the geojson `NAME_1` (lowercase, non-alnum →
  `-`), e.g. `uttar-pradesh.json`, `orissa.json`.

## Known name gaps vs `*_nfhs5` data

This source predates some boundary changes. Handled in `client/src/lib/geo/states.ts`
(state aliases) and `client/src/lib/geo/aliases.ts` (district aliases). Unmatched
districts still appear in the ranked list (marked "not mapped"); the map just doesn't shade
them.

- State names: data `Odisha` → geojson `Orissa`; data `Uttarakhand` → geojson `Uttaranchal`.
- `Telangana` has no polygon here (folded into Andhra Pradesh); its districts live in
  `andhra-pradesh.json`. Telangana does not shade at the national level.

## Regenerate

```bash
curl -L -o _s.json https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson
curl -L -o _d.json https://raw.githubusercontent.com/geohacker/india/master/district/india_district.geojson
npx -y mapshaper _s.json -filter-fields NAME_1 -simplify 4% keep-shapes -clean -o precision=0.001 india_states.json
npx -y mapshaper _d.json -filter-fields NAME_1,NAME_2 -simplify 3% keep-shapes -clean -split NAME_1 -o precision=0.001 districts/
# then slugify district filenames (see git history)
```
