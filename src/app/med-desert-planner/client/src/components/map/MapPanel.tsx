import { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { DistrictScore, EvidenceRow, StateRow, ViewState } from '../../types';
import { normalizeName } from '../../lib/geo/normalize';
import { geoStateNames } from '../../lib/geo/states';
import { matchDistrictFeature, type GeoFeatureLite } from '../../lib/geo/matchDistrict';
import { aggregateToStates } from '../../lib/geo/aggregate';
import { DATA_POOR_HEX, FACILITY_DOT_HEX, NO_DATA_HEX, riskHex } from '../../lib/labels';
import { groupEvidence } from '../../lib/group';
import { featureStateFor, stateFeatureState, type FeatureGapState } from './choropleth';
import { Breadcrumb } from './Breadcrumb';
import { Legend } from './Legend';

const W = 1000;
const H = 720;
const PAD = 38;

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

function boundsOf(features: Feature[]): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const walk = (coords: unknown) => {
    if (typeof coords === 'number') return;
    if (Array.isArray(coords) && typeof coords[0] === 'number') {
      const [x, y] = coords as number[];
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      return;
    }
    if (Array.isArray(coords)) coords.forEach(walk);
  };

  features.forEach((f) => f.geometry && walk((f.geometry as Geometry & { coordinates?: unknown }).coordinates));
  return minX === Infinity ? null : { minX, minY, maxX, maxY };
}

function project(lng: number, lat: number, bounds: Bounds): { x: number; y: number } {
  const spanX = Math.max(bounds.maxX - bounds.minX, 0.0001);
  const spanY = Math.max(bounds.maxY - bounds.minY, 0.0001);
  const scale = Math.min((W - PAD * 2) / spanX, (H - PAD * 2) / spanY);
  const usedW = spanX * scale;
  const usedH = spanY * scale;

  return {
    x: (W - usedW) / 2 + (lng - bounds.minX) * scale,
    y: (H - usedH) / 2 + (bounds.maxY - lat) * scale,
  };
}

function pathFor(feature: Feature, bounds: Bounds): string {
  const point = ([lng, lat]: number[]) => {
    const p = project(lng, lat, bounds);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  };
  const ringPath = (ring: number[][]) => (ring.length ? `M${ring.map(point).join('L')}Z` : '');
  const geom = feature.geometry as Geometry & { coordinates?: unknown };

  if (geom.type === 'Polygon') return (geom.coordinates as number[][][]).map(ringPath).join('');
  if (geom.type === 'MultiPolygon') {
    return (geom.coordinates as number[][][][]).map((poly) => poly.map(ringPath).join('')).join('');
  }
  return '';
}

function gapFill(state: { has: boolean; gap: number; dataPoor: boolean } | undefined): string {
  if (!state?.has) return NO_DATA_HEX;
  if (state.dataPoor) return DATA_POOR_HEX;
  return riskHex(state.gap);
}

function finiteCoordinate(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function MapPanel({
  view,
  states,
  rows,
  evidence,
  statesGeo,
  districtsGeo,
  onSelectState,
  onSelectDistrict,
  onNational,
  onBackToState,
  onPingFacility,
}: {
  view: ViewState;
  states: StateRow[];
  rows: DistrictScore[];
  evidence: EvidenceRow[];
  statesGeo: FeatureCollection | null;
  districtsGeo: FeatureCollection | null;
  onSelectState: (dataState: string) => void;
  onSelectDistrict: (row: DistrictScore) => void;
  onNational: () => void;
  onBackToState: () => void;
  onPingFacility: (facilityId: string) => void;
}) {
  const geoToDataState = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of states) {
      for (const geoName of geoStateNames(s.state)) m.set(normalizeName(geoName), s.state);
    }
    return m;
  }, [states]);

  const stateRows = useMemo(() => (view.state ? rows.filter((r) => r.state === view.state) : rows), [rows, view.state]);

  const districtFeatures = useMemo<GeoFeatureLite[]>(() => {
    if (!districtsGeo) return [];
    return districtsGeo.features.map((f) => {
      const district = String(f.properties?.NAME_2 ?? '');
      return { district, normalized: normalizeName(district) };
    });
  }, [districtsGeo]);

  const geoDistrictToRow = useMemo(() => {
    const m = new Map<string, DistrictScore>();
    if (!view.state) return m;
    for (const r of stateRows) {
      const match = matchDistrictFeature(r.district_name, view.state, districtFeatures);
      if (match && !m.has(match.district)) m.set(match.district, r);
    }
    return m;
  }, [districtFeatures, stateRows, view.state]);

  const selectedGeoDistrict = useMemo(() => {
    if (!view.state || !view.district) return null;
    return matchDistrictFeature(view.district, view.state, districtFeatures)?.district ?? null;
  }, [districtFeatures, view.district, view.state]);

  const features = view.level === 'national' ? (statesGeo?.features ?? []) : (districtsGeo?.features ?? []);
  const boundsFeatures = useMemo(() => {
    if (view.level !== 'district' || !selectedGeoDistrict) return features;
    const selected = features.filter((f) => String(f.properties?.NAME_2 ?? '') === selectedGeoDistrict);
    return selected.length ? selected : features;
  }, [features, selectedGeoDistrict, view.level]);
  const bounds = useMemo(() => boundsOf(boundsFeatures), [boundsFeatures]);
  const paths = useMemo(() => {
    if (!bounds) return [];
    return features.map((feature, index) => ({
      feature,
      index,
      path: pathFor(feature, bounds),
      name: String(feature.properties?.[view.level === 'national' ? 'NAME_1' : 'NAME_2'] ?? ''),
    }));
  }, [bounds, features, view.level]);

  const stateGapState = useMemo(() => {
    const m = new Map<string, FeatureGapState>();
    for (const agg of aggregateToStates(rows)) {
      const gapState = stateFeatureState(agg.maxGap, agg.dataPoorShare, agg.districtCount);
      for (const geoName of geoStateNames(agg.state)) m.set(geoName, gapState);
    }
    return m;
  }, [rows]);

  const facilities = useMemo(
    () =>
      groupEvidence(evidence).filter(
        (f) => finiteCoordinate(f.latitude) !== null && finiteCoordinate(f.longitude) !== null
      ),
    [evidence]
  );

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2 px-4 py-2.5">
        <Breadcrumb view={view} onNational={onNational} onState={onBackToState} />
        {view.level !== 'national' && (
          <button
            type="button"
            onClick={onNational}
            title="Reset view"
            aria-label="Reset view"
            className="grid size-7 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-line text-muted hover:border-faint hover:text-ink"
          >
            <RotateCcw className="size-3.5" />
          </button>
        )}
      </div>

      <div className="relative min-h-0 flex-1 bg-map-bg">
        {!bounds || paths.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center bg-bg-sunken p-6 text-center">
            <span className="text-xs text-muted">Loading geography…</span>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 size-full"
            role="img"
            aria-label="Coverage map"
          >
            <rect width={W} height={H} fill="var(--color-map-bg)" />
            <defs>
              <pattern id="dataPoorHatch" width="8" height="8" patternUnits="userSpaceOnUse">
                <rect width="8" height="8" fill={DATA_POOR_HEX} />
                <path d="M-2,8 L8,-2 M2,10 L10,2" stroke="var(--color-faint)" strokeWidth="1.2" opacity="0.75" />
              </pattern>
            </defs>
            {paths.map(({ path, name, index }) => {
              const row = view.level === 'national' ? null : geoDistrictToRow.get(name);
              const selected =
                view.level === 'district' && selectedGeoDistrict !== null && name === selectedGeoDistrict;
              const gapState =
                view.level === 'national' ? stateGapState.get(name) : row ? featureStateFor(row) : undefined;
              const fill = gapState?.dataPoor ? 'url(#dataPoorHatch)' : gapFill(gapState);

              return (
                <path
                  key={`${name}-${index}`}
                  d={path}
                  fill={fill}
                  stroke={selected ? 'var(--color-ink)' : '#ffffff'}
                  strokeWidth={selected ? 2.6 : 1}
                  opacity={selected ? 0.98 : 0.88}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                  onClick={() => {
                    if (view.level === 'national') {
                      const dataState = geoToDataState.get(normalizeName(name));
                      if (dataState) onSelectState(dataState);
                    } else if (row) {
                      onSelectDistrict(row);
                    }
                  }}
                >
                  <title>{row ? `${row.district_name}, ${row.state}` : name}</title>
                </path>
              );
            })}

            {view.level !== 'national' &&
              facilities.map((facility) => {
                const latitude = finiteCoordinate(facility.latitude);
                const longitude = finiteCoordinate(facility.longitude);
                if (latitude === null || longitude === null) return null;
                const p = project(longitude, latitude, bounds);
                return (
                  <circle
                    key={facility.facility_id}
                    cx={p.x}
                    cy={p.y}
                    r={7}
                    fill={FACILITY_DOT_HEX}
                    stroke="#ffffff"
                    strokeWidth={2}
                    className="cursor-pointer"
                    onClick={() => onPingFacility(facility.facility_id)}
                  >
                    <title>{facility.facility_name}</title>
                  </circle>
                );
              })}
          </svg>
        )}
        <Legend />
      </div>
    </div>
  );
}
