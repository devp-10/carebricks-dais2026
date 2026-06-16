# Medical Desert Planner — UI Revamp Design

Date: 2026-06-15
Status: approved (pending spec review)
Author: design+frontend pass

## Context

The Medical Desert Planner is a Databricks App (AppKit + React 19 + Tailwind v4 +
TypeScript, Vite). The data layer is built and live: gold tables expose
`district_capability_scores`, `district_demand_scores`, and `district_facility_evidence`;
the app persists `planning_scenarios`, `shortlist_items`, and `claim_reviews` through
existing `/api/*` routes.

The current UI (`client/src/App.tsx` + hand-rolled `index.css`) is a dark three-column
layout with a faked "map" (CSS dots in a box). It works but is visually weak and the map —
the conceptual centerpiece — is not real geography. This revamp rebuilds everything above
the data plumbing.

### The user

A **non-technical healthcare planner** (Virtue Foundation field planning). The app must
answer one question and earn trust while doing it:

> Where are the highest-risk gaps in care, and how confident are we that those gaps are real?

### Confirmed direction (from brainstorming)

- **Real interactive map** — basemap + district choropleth colored by gap risk + facility
  pins, with India → region → district drilldown.
- **Minimal, AI-era modern premium** aesthetic. **No teal.** Single confident **blue**
  accent.
- **National scope, India default.** Region dropdown defaults to **"All — India"**;
  selecting a region zooms the map into it.

### Data footprint (queried live, 2026-06-15)

- 28 states + an explicit `Unresolved` bucket + `Chandigarh`. UP largest (58 districts),
  Bihar is one of many (29). National.
- Specialties are machine names (`gynecologyAndObstetrics`, `internalMedicine`, …) →
  must render `display_name` from `silver.specialty_vocabulary`.
- Verdict labels present: `likely_real_gap`, `data_poor_high_need`, `mixed_evidence`,
  `lower_priority`.
- Confidence labels present: `sufficient_evidence`, `data_poor` (only two values observed).

## The central design principle

**Gap risk and data confidence are orthogonal and must be encoded on different visual
channels, everywhere.** A data-poor district must never read as a confirmed desert.

- **Gap risk → hue.** Sequential ramp: slate → amber → terracotta → crimson (low → high).
- **Data confidence → texture/opacity.** Trusted = solid fill. Data-poor = desaturated +
  diagonal hatch + a small `⧗` "needs data" marker.
- This pairing appears in the map choropleth, the legend, the ranked list rails, and the
  district detail.

## Experience & layout

Single-screen, map-led workspace.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Medical Desert Planner            NFHS-5 demand · 10k facilities  ⬡  │ app bar
├──────────────────────────────────────────────────────────────────────┤
│  Capability ▾   Region ▾ All — India        ◖verdict / confidence◗     │ control bar
├───────────────────────────────────────────┬────────────────────────────┤
│  India ▸ Bihar ▸ Araria   (breadcrumb)     │  KPI strip (3–4 figures)    │
│  ┌──────────────────────────────────────┐  │ ┌────────────────────────┐  │
│  │  MapLibre basemap                    │  │ │ Ranked districts,       │  │
│  │  ▓▓░░ choropleth = gap risk          │  │ │ grouped by verdict:     │  │
│  │  ⌖ ⌖  facility pins (trust tier)     │  │ │  • Likely real gap      │  │
│  │  legend: hue=risk  hatch=data-poor   │  │ │  • Data-poor high need  │  │
│  └──────────────────────────────────────┘  │ │  • Mixed / Lower prio   │  │
│  [reset view]                              │ └────────────────────────┘  │
└───────────────────────────────────────────┴────────────────────────────┘
   selecting a district → map zooms + district detail opens over the rail
```

### Regions of the screen

1. **App bar** — wordmark + source provenance + scenario status. Slim.
2. **Control bar** — Capability selector (searchable, display names + facility counts),
   Region selector (default "All — India"), verdict/confidence filter (segmented).
3. **Map panel** (left, dominant ~58–62%) — persistent. Breadcrumb (India ▸ State ▸
   District), MapLibre choropleth, facility pins, dual-encoding legend, reset-view.
4. **Insight rail** (right ~38–42%) — KPI strip then ranked district list grouped by
   verdict. Map and list stay in sync (select in either → both update).
5. **District detail** — opens over the rail when a district is selected:
   - **Demand context**: NFHS-5 indicator values with quality flags (suppressed /
     low-sample).
   - **Supply**: `k of n` facilities, documented-supply rate, **Wilson interval drawn as
     an uncertainty band** (not just two numbers).
   - **"Is this gap real?" 2×2 quadrant**: gap × confidence, places the district in
     *Act now / Go collect data / Covered / Lower priority*.
   - **Facility evidence list**: each facility expands to verbatim claims with highlighted
     span, source-field badge, source link, trust tier, and review actions
     (verified / disputed / unclear) + shortlist.
6. **Scenario** (slide-in / drawer) — flagged districts + shortlisted facilities + notes +
   saved scenarios. Wired to existing `/api/scenarios`, `/api/shortlist`,
   `/api/claim-reviews`.

## Visual language

- **Base**: warm-neutral near-white canvas, near-black ink, hairline borders, restrained
  shadow, generous spacing.
- **Accent**: single premium **blue** — primary `#2F6BFF` (azure), `#1E4FD8` for
  hover/ink, soft blue tints for selection. Deliberately distinct from the warm risk ramp
  so brand and data never fight.
- **Risk ramp (semantic, separate from brand)**: slate `#5B6472` → amber `#E6A23C` →
  terracotta `#D2693F` → crimson `#B23B3B`. Data-poor treatment: desaturate + diagonal
  hatch.
- **Trust tiers (facility pins/claims)**: strong / partial / weak / no-claim — green-leaning
  to muted, kept legible against the risk ramp.
- **Type**: clean grotesk for UI (Geist or Inter), **mono numerals (Geist Mono / IBM Plex
  Mono) for every metric** — the mono-figure treatment is the "modern premium" signal.
  Tight tracking on large figures. No rustic serif.
- **Motion**: purposeful only — map zoom easing, list↔detail crossfade, subtle
  pin/skeleton transitions. Full `prefers-reduced-motion` support.
- **States**: loading skeletons, empty, and error states for every async surface. No dead
  ends. Accessible contrast, keyboard navigation, focus rings on the accent.

## Map technical approach

- **Library**: MapLibre GL JS (open, token-free). Muted light basemap (Carto Positron
  style or equivalent token-free style), kept low-contrast so data reads.
- **Zoom tiers**:
  - **National** → **state choropleth** (district gap aggregated to state level).
  - **Region selected** → that state's **district polygons** lazy-loaded and shaded.
  - **District** → **facility pins** (MapLibre circle layer, colored by trust tier).
- **GeoJSON asset**: India ADM1 (states, small, always loaded) + ADM2 (districts,
  per-state lazy load). Stored as static client assets; simplified to keep bundle small.

### Primary build risk: district name matching

`district_nfhs5` names will not perfectly match the GeoJSON feature names. Mitigation:

- Normalize names (lowercase, strip punctuation/diacritics, common token fixes) and match
  within the resolved state.
- Maintain a small alias map for known mismatches (mirrors the existing
  `district_alias_map` concept).
- **Any district that fails to match still appears in the ranked list** (unshaded, marked
  "not mapped"). The list is the source of truth; the map is an enhancement that degrades
  gracefully.

This matching is the riskiest piece and is sequenced early.

## Data / query changes (small, additive)

- `specialties.obo.sql` → also select `display_name` (render display name, keep machine
  `specialty` as the value).
- New `district_demand_detail.obo.sql` → NFHS-5 indicator values + quality flags from
  `district_demand_scores` (and `nfhs5_clean` where needed) for the detail panel.
- Keep `district_scores`, `district_evidence`, `states`, `saved_scenarios` and all
  `/api/*` persistence routes unchanged.

## Build phases (isolation-friendly units)

1. **Foundation** — design tokens (color/type/space), global styles, app shell, control
   bar. Replaces `index.css` approach with a token-driven system.
2. **Map module** — MapLibre integration, GeoJSON assets, state choropleth, district
   drilldown, facility pins, dual-encoding legend, **name-matching layer** (highest risk,
   done first within this phase).
3. **Insight rail** — KPI strip, ranked grouped district list, map↔list selection sync.
4. **District detail + evidence** — demand context, supply + Wilson band, "is this gap
   real?" quadrant, facility list, verbatim claims, review actions, shortlist.
5. **Scenario / persistence** — flag districts, shortlist facilities, notes, saved
   scenarios; wire to existing API.
6. **States, a11y, motion, responsive polish** — skeleton/empty/error everywhere,
   keyboard nav, reduced-motion, breakpoints.

## Out of scope

- No changes to the medallion data build or the gold/silver table definitions.
- No new persistence tables or schema changes (existing `app.*` tables are sufficient).
- No LLM/Genie features in this pass.

## Success criteria

- A planner can: pick a capability, see national risk, drill India → state → district,
  read why a district is (or is not) a confirmed gap, open verbatim facility evidence,
  review claims, shortlist facilities, and save a scenario.
- Data-poor is never visually confusable with a confirmed gap.
- Every async surface has loading / empty / error states.
- The map degrades gracefully when a district can't be matched to geometry.
