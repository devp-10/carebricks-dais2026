import { normalizeName } from './normalize';
import { DISTRICT_ALIASES } from './aliases';

export type GeoFeatureLite = { district: string; normalized: string };

export function matchDistrictFeature(
  districtName: string,
  stateName: string,
  features: GeoFeatureLite[],
): GeoFeatureLite | null {
  const norm = normalizeName(districtName);
  const aliasKey = `${normalizeName(stateName)}::${norm}`;
  const target = DISTRICT_ALIASES[aliasKey] ?? norm;

  const exact = features.find((f) => f.normalized === target);
  if (exact) return exact;

  // last-resort: a feature whose normalized name overlaps the target prefix
  const startsWith = features.find(
    (f) => f.normalized.startsWith(target) || target.startsWith(f.normalized),
  );
  return startsWith ?? null;
}
