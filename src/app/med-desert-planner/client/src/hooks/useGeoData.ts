import { useEffect, useRef, useState, useCallback } from 'react';
import type { FeatureCollection } from 'geojson';
import { normalizeName } from '../lib/geo/normalize';
import { GEO_PROP, districtFileUrl } from '../lib/geo/states';
import type { GeoFeatureLite } from '../lib/geo/matchDistrict';

async function fetchGeo(url: string): Promise<FeatureCollection | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as FeatureCollection;
  } catch {
    return null;
  }
}

/** Lite list of districts present in a state's geojson, for name matching. */
export function featuresFor(fc: FeatureCollection | null): GeoFeatureLite[] {
  if (!fc) return [];
  return fc.features.map((f) => {
    const district = String(f.properties?.[GEO_PROP.district] ?? '');
    return { district, normalized: normalizeName(district) };
  });
}

export function useGeoData() {
  const [states, setStates] = useState<FeatureCollection | null>(null);
  const [districts, setDistricts] = useState<FeatureCollection | null>(null);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const cache = useRef<Map<string, FeatureCollection | null>>(new Map());

  useEffect(() => {
    let alive = true;
    void fetchGeo('/geo/india_states.json').then((fc) => {
      if (alive) setStates(fc);
    });
    return () => {
      alive = false;
    };
  }, []);

  const loadDistricts = useCallback(async (dataState: string | null) => {
    if (!dataState) {
      setDistricts(null);
      return;
    }
    const url = districtFileUrl(dataState);
    if (cache.current.has(url)) {
      setDistricts(cache.current.get(url) ?? null);
      return;
    }
    setLoadingDistricts(true);
    const fc = await fetchGeo(url);
    cache.current.set(url, fc);
    setDistricts(fc);
    setLoadingDistricts(false);
  }, []);

  return { states, districts, loadDistricts, loadingDistricts };
}
