import { useEffect, useRef, useState } from 'react';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import { isWebGLAvailable } from '../../lib/webgl';

const INDIA_CENTER: [number, number] = [82.5, 22.5];

/**
 * Inline base style — no remote style.json dependency, so `load` always fires and our
 * choropleth always renders. A best-effort Carto raster basemap is layered on top; if the
 * tiles are slow or blocked, the soft paper background still shows beneath the data.
 */
const BASE_STYLE: StyleSpecification = {
  version: 8,
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
  sources: {
    'carto-light': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap © CARTO',
    },
  },
  layers: [
    { id: 'paper', type: 'background', paint: { 'background-color': '#f1efe9' } },
    { id: 'carto-light', type: 'raster', source: 'carto-light', paint: { 'raster-opacity': 0.9 } },
  ],
};

export function useMapLibre() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  // true when WebGL is unavailable or MapLibre fails to initialize → callers fall back.
  const [failed, setFailed] = useState(() => !isWebGLAvailable());

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current || failed) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container,
        style: BASE_STYLE,
        center: INDIA_CENTER,
        zoom: 3.5,
        minZoom: 3,
        maxZoom: 11,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
    } catch (err) {
      // e.g. WebGL context creation fails at runtime despite the probe passing.
      console.warn('MapLibre init failed, using SVG fallback', err);
      setFailed(true);
      return;
    }

    map.on('error', (e) => {
      const msg = (e?.error as Error | undefined)?.message ?? '';
      if (/webgl/i.test(msg)) setFailed(true);
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => setReady(true));
    mapRef.current = map;

    // MapLibre doesn't track container (flex/grid) resizes by itself.
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [failed]);

  return { containerRef, mapRef, ready, failed };
}

export { INDIA_CENTER };
