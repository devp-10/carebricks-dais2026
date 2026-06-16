import { normalizeName } from './normalize';

// geojson feature property keys (see client/public/geo/README.md)
export const GEO_PROP = { state: 'NAME_1', district: 'NAME_2' } as const;

// data `state_nfhs5` → geojson `NAME_1` for sources that predate boundary changes.
export const STATE_ALIASES: Record<string, string> = {
  Odisha: 'Orissa',
  Uttarakhand: 'Uttaranchal',
  // Telangana has no polygon in this source; its districts sit under Andhra Pradesh.
  Telangana: 'Andhra Pradesh',
};

export function geoStateName(dataState: string): string {
  return STATE_ALIASES[dataState] ?? dataState;
}

/** Slug used for both the national-choropleth state match and the per-state district file. */
export function stateSlug(geojsonStateName: string): string {
  return normalizeName(geojsonStateName).replace(/\s+/g, '-');
}

export function districtFileUrl(dataState: string): string {
  return `/geo/districts/${stateSlug(geoStateName(dataState))}.json`;
}
