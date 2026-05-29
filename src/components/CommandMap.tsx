'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { DomainData, SiteRecord, StatusLevel } from '@/data/sites';

interface CommandMapProps {
  data: any;
  activeLayers: Record<string, boolean>;
  onEntityClick?: (entity: any) => void;
  onSiteClick?: (site: SiteRecord) => void;
  selectedSiteId?: string | null;
  sitesData?: SiteRecord[];
  onMouseCoords?: (coords: { lat: number; lng: number }) => void;
  onRightClick?: (coords: { lat: number; lng: number }) => void;
  onViewStateChange?: (vs: { zoom: number; latitude: number }) => void;
  flyToLocation?: { lat: number; lng: number; ts: number; zoom?: number } | null;
  projection?: 'mercator' | 'globe';
  mapStyle?: string;
}

function computeSolarTerminator(): [number, number][] {
  const now = new Date();
  const day = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const decl = -23.44 * Math.cos((2 * Math.PI / 365) * (day + 10));
  const decRad = decl * Math.PI / 180;
  const utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
  const subsolarLng = (12 - utcH) * 15;
  const pts: [number, number][] = [];
  for (let lng = -180; lng <= 180; lng += 2) {
    const lngRad = (lng - subsolarLng) * Math.PI / 180;
    const lat = Math.atan(-Math.cos(lngRad) / Math.tan(decRad)) * 180 / Math.PI;
    pts.push([lng, lat]);
  }
  const darkSide = decl >= 0 ? -90 : 90;
  pts.push([180, darkSide], [-180, darkSide], pts[0]);
  return pts;
}

const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] };

const STATUS_COLORS: Record<StatusLevel, string> = {
  HEALTHY: '#10B981',
  WATCH: '#F59E0B',
  CRITICAL: '#EF4444',
};
const ACCENT_PRIMARY = '#22D3EE';
const TEXT_SECONDARY = 'rgba(255,255,255,0.65)';
const TEXT_TERTIARY = 'rgba(255,255,255,0.4)';
const DEFAULT_DARK_MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';
const CONTROLLED_LABEL_MAX_ZOOM = 7;

const STATUS_RANK: Record<StatusLevel, number> = { HEALTHY: 0, WATCH: 1, CRITICAL: 2 };

function getWorstSiteStatus(site: SiteRecord): StatusLevel {
  return Object.values(site.domains).reduce<StatusLevel>((worst, domain) =>
    STATUS_RANK[domain.status] > STATUS_RANK[worst] ? domain.status : worst,
  'HEALTHY');
}

function getSiteActivityVolume(site: SiteRecord): number {
  return Object.values(site.domains).reduce((total, domain) => {
    return total + Object.entries(domain as DomainData & Record<string, unknown>).reduce((domainTotal, [key, value]) => {
      if (key === 'score' || key === 'trend') return domainTotal;
      return typeof value === 'number' ? domainTotal + value : domainTotal;
    }, 0);
  }, 0);
}

function getMarkerRadius(activityVolume: number): number {
  const normalized = Math.log10(Math.max(activityVolume, 1)) / 4;
  return Math.round(Math.min(22, Math.max(8, 8 + normalized * 14)) * 10) / 10;
}


function CommandMap({
  data, activeLayers, onEntityClick, onSiteClick, selectedSiteId, sitesData,
  onMouseCoords, onRightClick, onViewStateChange,
  flyToLocation, projection = 'globe', mapStyle = 'dark',
}: CommandMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const prevStyleRef = useRef(mapStyle);
  const onSiteClickRef = useRef<((siteId: string, lat: number, lng: number) => void) | undefined>(undefined);
  useEffect(() => { onSiteClickRef.current = onSiteClick ? (id, lat, lng) => {
    const site = sitesData?.find(s => s.id === id);
    if (site) onSiteClick(site);
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 6, duration: 1000, easing: (t) => t < 0.5 ? 2*t*t : -1+(4-2*t)*t, essential: true });
  } : undefined; }, [onSiteClick, sitesData]);

  const createDot = useCallback((map: maplibregl.Map, id: string, color: string, size: number) => {
    if (map.hasImage(id)) return;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    map.addImage(id, { width: size, height: size, data: new Uint8Array(ctx.getImageData(0, 0, size, size).data) });
  }, []);

  // Map init
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DEFAULT_DARK_MAP_STYLE,
      center: [10, 20], zoom: 2.0, minZoom: 1.5, maxZoom: 18,
      attributionControl: false,
      maxPitch: 85,
      dragPan: { inertia: true, inertiaDeceleration: 2800, inertiaMaxSpeed: 1200 } as any,
    });

    map.on('load', () => {
      mapRef.current = map;

      // Shared dot icons: strict palette only.
      createDot(map, 'dot-cyan', ACCENT_PRIMARY, 10);
      createDot(map, 'dot-healthy', STATUS_COLORS.HEALTHY, 10);
      createDot(map, 'dot-watch', STATUS_COLORS.WATCH, 10);
      createDot(map, 'dot-critical', STATUS_COLORS.CRITICAL, 10);
      createDot(map, 'dot-neutral', '#64748B', 8);

      if (map.getSource('carto')) {
        map.addLayer({
          id: 'controlled-region-labels',
          type: 'symbol',
          source: 'carto',
          'source-layer': 'place',
          maxzoom: CONTROLLED_LABEL_MAX_ZOOM,
          filter: ['match', ['get', 'class'], ['country', 'state'], true, false],
          layout: {
            'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
            'text-size': 11,
            'text-font': ['Open Sans Regular'],
            'text-transform': 'uppercase',
            'text-letter-spacing': 0.08,
            'text-allow-overlap': false,
            'symbol-sort-key': ['case', ['==', ['get', 'class'], 'country'], 0, 1],
          },
          paint: {
            'text-color': TEXT_TERTIARY,
            'text-halo-color': '#05070A',
            'text-halo-width': 1,
            'text-opacity': 0.62,
          },
        });
      }

      // Register all domain sources
      const SOURCES = [
        'exposure', 'app-assurance', 'arch-reviews',
        'dlp', 'dlp-events', 'dlp-choke',
        'ot-assets', 'it-assets',
        'campaigns', 'awareness', 'access-recert',
        'app-governance', 'retention',
        'day-night',
        'sites',
      ];
      SOURCES.forEach(s => map.addSource(s, { type: 'geojson', data: EMPTY_FC }));

      // ── Day/Night ──
      map.addLayer({ id: 'day-night-fill', type: 'fill', source: 'day-night',
        paint: { 'fill-color': '#05070A', 'fill-opacity': 0.35 } });

      // ── Exposure Findings ── (cyan, sized by finding count)
      map.addLayer({ id: 'exposure-glow', type: 'circle', source: 'exposure',
        paint: { 'circle-radius': ['interpolate',['linear'],['get','findings'], 0,8, 50,20, 200,35],
          'circle-color': '#22D3EE', 'circle-opacity': 0.08, 'circle-blur': 1 } });
      map.addLayer({ id: 'exposure-dots', type: 'circle', source: 'exposure',
        paint: {
          'circle-radius': ['interpolate',['linear'],['get','findings'], 0,4, 50,9, 200,16],
          'circle-color': ['match',['get','severity'], 'CRITICAL','#EF4444', 'HIGH','#F59E0B', 'MEDIUM','#F59E0B', '#22D3EE'],
          'circle-opacity': 0.85,
          'circle-stroke-width': 2,
          'circle-stroke-color': ['match',['get','severity'], 'CRITICAL','#EF4444', 'HIGH','#F59E0B', 'MEDIUM','#F59E0B', '#22D3EE'],
          'circle-stroke-opacity': 0.4,
        } });
      map.addLayer({ id: 'exposure-label', type: 'symbol', source: 'exposure', minzoom: 4,
        layout: { 'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
          'text-offset': [0, 1.8], 'text-max-width': 14, 'text-allow-overlap': false },
        paint: { 'text-color': '#22D3EE', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 } });

      // ── App Assurance ── (watch status, by findings count)
      map.addLayer({ id: 'assurance-glow', type: 'circle', source: 'app-assurance',
        paint: { 'circle-radius': ['interpolate',['linear'],['get','findings'], 0,6, 30,14, 70,22],
          'circle-color': '#F59E0B', 'circle-opacity': 0.1, 'circle-blur': 1 } });
      map.addLayer({ id: 'assurance-dots', type: 'circle', source: 'app-assurance',
        paint: {
          'circle-radius': ['interpolate',['linear'],['get','findings'], 0,4, 30,8, 70,14],
          'circle-color': ['match',['get','severity'], 'CRITICAL','#EF4444', 'HIGH','#F59E0B', 'MEDIUM','#F59E0B', '#10B981'],
          'circle-opacity': 0.85,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#F59E0B', 'circle-stroke-opacity': 0.4,
        } });

      // ── Architecture Reviews ──
      map.addLayer({ id: 'arch-circles', type: 'circle', source: 'arch-reviews',
        paint: {
          'circle-radius': ['interpolate',['linear'],['get','score'], 1,4, 3,8, 5,16],
          'circle-color': ['interpolate',['linear'],['get','score'], 1,'#10B981', 3,'#F59E0B', 5,'#F59E0B'],
          'circle-opacity': 0.65, 'circle-blur': 0.3,
          'circle-stroke-width': 1, 'circle-stroke-color': '#F59E0B', 'circle-stroke-opacity': 0.3,
        } });
      map.addLayer({ id: 'arch-label', type: 'symbol', source: 'arch-reviews',
        filter: ['>=',['get','score'],4.0],
        layout: { 'text-field': ['concat',['get','type'],'  ',['to-string',['get','score']]],
          'text-size': 9, 'text-font': ['Open Sans Regular'], 'text-offset': [0, 1.5] },
        paint: { 'text-color': '#F59E0B', 'text-halo-color': '#000', 'text-halo-width': 1 } });

      // ── DLP Sites ── (teal, like maritime ports)
      map.addLayer({ id: 'dlp-glow', type: 'circle', source: 'dlp',
        paint: { 'circle-radius': ['interpolate',['linear'],['zoom'], 1,6, 5,12, 10,20],
          'circle-color': '#22D3EE', 'circle-opacity': 0.1, 'circle-blur': 1 } });
      map.addLayer({ id: 'dlp-dots', type: 'circle', source: 'dlp',
        paint: { 'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,9],
          'circle-color': ['match',['get','type'], 'email','#22D3EE', 'cloud','#22D3EE', 'api','#22D3EE', '#22D3EE'],
          'circle-opacity': 0.85,
          'circle-stroke-width': 2, 'circle-stroke-color': '#22D3EE', 'circle-stroke-opacity': 0.4 } });
      map.addLayer({ id: 'dlp-label', type: 'symbol', source: 'dlp', minzoom: 4,
        layout: { 'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
          'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false },
        paint: { 'text-color': '#22D3EE', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 } });

      // ── DLP Incidents ── (moving events, like ships)
      map.addLayer({ id: 'dlp-events-dots', type: 'circle', source: 'dlp-events',
        paint: { 'circle-radius': ['interpolate',['linear'],['zoom'], 1,2, 5,4, 10,6],
          'circle-color': ['match',['get','severity'], 'CRITICAL','#EF4444', 'HIGH','#F59E0B', 'MEDIUM','#F59E0B', '#10B981'],
          'circle-opacity': 0.8 } });

      // ── DLP Chokepoints ── (high-risk data flows)
      map.addLayer({ id: 'dlp-choke-glow', type: 'circle', source: 'dlp-choke',
        paint: { 'circle-radius': ['interpolate',['linear'],['zoom'], 1,10, 5,18, 10,28],
          'circle-color': '#F59E0B', 'circle-opacity': 0.12, 'circle-blur': 1 } });
      map.addLayer({ id: 'dlp-choke-dots', type: 'circle', source: 'dlp-choke',
        paint: { 'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,7, 10,12],
          'circle-color': ['match',['get','risk'], 'CRITICAL','#EF4444', 'HIGH','#F59E0B', 'ELEVATED','#F59E0B', '#10B981'],
          'circle-opacity': 0.9,
          'circle-stroke-width': 2, 'circle-stroke-color': '#F59E0B', 'circle-stroke-opacity': 0.5 } });
      map.addLayer({ id: 'dlp-choke-label', type: 'symbol', source: 'dlp-choke', minzoom: 3,
        layout: { 'text-field': ['get','name'], 'text-size': 10, 'text-font': ['Open Sans Bold'],
          'text-offset': [0, 2], 'text-max-width': 14, 'text-allow-overlap': false },
        paint: { 'text-color': '#F59E0B', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.9 } });

      // ── OT Asset Registry ──
      map.addLayer({ id: 'ot-heat', type: 'circle', source: 'ot-assets',
        paint: { 'circle-radius': ['interpolate',['linear'],['zoom'], 1,2, 5,4, 10,8],
          'circle-color': ['match',['get','criticality'], 'CRITICAL','#EF4444', 'HIGH','#F59E0B', '#10B981'],
          'circle-opacity': 0.6, 'circle-blur': 0.4 } });

      // ── IT Asset Registry ──
      map.addLayer({ id: 'it-glow', type: 'circle', source: 'it-assets',
        paint: { 'circle-radius': ['interpolate',['linear'],['zoom'], 1,5, 5,8, 10,14, 14,20],
          'circle-color': '#10B981', 'circle-opacity': 0.08, 'circle-blur': 1 } });
      map.addLayer({ id: 'it-dots', type: 'circle', source: 'it-assets',
        paint: { 'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8, 14,12],
          'circle-color': ['match',['get','category'], 'server','#10B981', 'endpoint','#22D3EE', 'network','#22D3EE', '#22D3EE'],
          'circle-opacity': 0.8,
          'circle-stroke-width': 2, 'circle-stroke-color': '#10B981', 'circle-stroke-opacity': 0.5 } });

      // ── Simulated Campaigns ──
      map.addLayer({ id: 'campaign-glow', type: 'circle', source: 'campaigns',
        paint: { 'circle-radius': ['interpolate',['linear'],['zoom'], 1,12, 5,20, 10,30],
          'circle-color': '#22D3EE', 'circle-opacity': 0.1, 'circle-blur': 1 } });
      map.addLayer({ id: 'campaign-dots', type: 'circle', source: 'campaigns',
        paint: { 'circle-radius': ['interpolate',['linear'],['zoom'], 1,5, 5,8, 10,14],
          'circle-color': ['match',['get','severity'], 'critical','#EF4444', 'high','#F59E0B', 'medium','#22D3EE', '#F59E0B'],
          'circle-opacity': 0.85,
          'circle-stroke-width': 2, 'circle-stroke-color': '#22D3EE', 'circle-stroke-opacity': 0.4 } });
      map.addLayer({ id: 'campaign-label', type: 'symbol', source: 'campaigns', minzoom: 4,
        layout: { 'text-field': ['concat',['to-string',['get','click_rate']],'%'],
          'text-size': 9, 'text-font': ['Open Sans Bold'], 'text-offset': [0, 2], 'text-allow-overlap': false },
        paint: { 'text-color': '#22D3EE', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.8 } });

      // ── Awareness Reach ── (accent dots from news items with coords)
      map.addLayer({ id: 'awareness-glow', type: 'circle', source: 'awareness',
        paint: { 'circle-radius': ['interpolate',['linear'],['zoom'], 1,6, 5,10, 10,18],
          'circle-color': '#22D3EE', 'circle-opacity': 0.12, 'circle-blur': 1 } });
      map.addLayer({ id: 'awareness-dots', type: 'circle', source: 'awareness',
        paint: { 'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8],
          'circle-color': '#22D3EE', 'circle-opacity': 0.9,
          'circle-stroke-width': 1.5, 'circle-stroke-color': 'rgba(255,255,255,0.95)', 'circle-stroke-opacity': 0.6 } });

      // ── Access Recertification ──
      map.addLayer({ id: 'access-glow', type: 'circle', source: 'access-recert',
        paint: { 'circle-radius': ['interpolate',['linear'],['get','overdue'], 0,6, 20,12, 50,20],
          'circle-color': '#EF4444', 'circle-opacity': 0.1, 'circle-blur': 1 } });
      map.addLayer({ id: 'access-dots', type: 'circle', source: 'access-recert',
        paint: { 'circle-radius': ['interpolate',['linear'],['get','overdue'], 0,4, 20,7, 50,12],
          'circle-color': ['match',['get','severity'], 'critical','#EF4444', 'high','#F59E0B', '#F59E0B'],
          'circle-opacity': 0.85,
          'circle-stroke-width': 1, 'circle-stroke-color': '#EF4444', 'circle-stroke-opacity': 0.3 } });

      // ── App Governance ──
      map.addLayer({ id: 'gov-dots', type: 'circle', source: 'app-governance',
        paint: { 'circle-radius': ['interpolate',['linear'],['zoom'], 1,2, 5,4, 10,6],
          'circle-color': ['match',['get','status'], 'Non-Compliant','#EF4444', 'At Risk','#F59E0B', 'Review Due','#F59E0B', '#10B981'], 'circle-opacity': 0.8 } });

      // ── Activity Retention ── (blue/green dots by coverage)
      map.addLayer({ id: 'retention-glow', type: 'circle', source: 'retention',
        paint: { 'circle-radius': ['interpolate',['linear'],['zoom'], 1,8, 5,14, 10,22],
          'circle-color': ['match',['get','status'], 'Non-Compliant','#EF4444', 'Gap Detected','#F59E0B', '#22D3EE'],
          'circle-opacity': 0.1, 'circle-blur': 1 } });
      map.addLayer({ id: 'retention-dots', type: 'circle', source: 'retention',
        paint: { 'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,10],
          'circle-color': ['match',['get','status'], 'Non-Compliant','#EF4444', 'Gap Detected','#F59E0B', '#10B981'],
          'circle-opacity': 0.85,
          'circle-stroke-width': 2,
          'circle-stroke-color': ['match',['get','status'], 'Non-Compliant','#EF4444', 'Gap Detected','#F59E0B', '#22D3EE'],
          'circle-stroke-opacity': 0.5 } });
      map.addLayer({ id: 'retention-label', type: 'symbol', source: 'retention', minzoom: 4,
        layout: { 'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
          'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false },
        paint: { 'text-color': '#22D3EE', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 } });

      // ── Site Markers ── one marker per site, sized by activity and colored by worst domain status.
      map.addLayer({ id: 'sites-glow', type: 'circle', source: 'sites',
        paint: {
          'circle-radius': ['+', ['get','markerRadius'], 4],
          'circle-color': ['get','statusColor'],
          'circle-opacity': 0.1,
          'circle-blur': 1,
        } });
      map.addLayer({ id: 'sites-critical-pulse', type: 'circle', source: 'sites',
        filter: ['==', ['get', 'status'], 'CRITICAL'],
        paint: {
          'circle-radius': ['+', ['get','markerRadius'], 3],
          'circle-color': 'transparent',
          'circle-opacity': 0,
          'circle-stroke-width': 1,
          'circle-stroke-color': STATUS_COLORS.CRITICAL,
          'circle-stroke-opacity': 0.28,
        } });
      map.addLayer({ id: 'sites-dots', type: 'circle', source: 'sites',
        paint: {
          'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], ['*', ['get','markerRadius'], 1.15], ['get','markerRadius']],
          'circle-color': ['get','statusColor'],
          'circle-opacity': 0.7,
          'circle-stroke-width': ['case', ['boolean', ['feature-state', 'hover'], false], 1.5, 1],
          'circle-stroke-color': ['get','statusColor'],
          'circle-stroke-opacity': 1,
        } });
      map.addLayer({ id: 'sites-ring', type: 'circle', source: 'sites',
        filter: ['==', ['get', 'id'], ''],
        paint: {
          'circle-radius': ['+', ['get','markerRadius'], 4],
          'circle-color': 'transparent',
          'circle-opacity': 0,
          'circle-stroke-width': 2,
          'circle-stroke-color': ACCENT_PRIMARY,
          'circle-stroke-opacity': 0.95,
        } });
      map.addLayer({ id: 'sites-label', type: 'symbol', source: 'sites', minzoom: 8,
        layout: {
          'text-field': ['get','name'],
          'text-size': 9, 'text-font': ['Open Sans Regular'],
          'text-offset': [0, 2.2], 'text-max-width': 12, 'text-allow-overlap': false,
        },
        paint: {
          'text-color': TEXT_SECONDARY,
          'text-halo-color': '#05070A', 'text-halo-width': 1.5, 'text-opacity': 0.78,
        } });

      let pulseFrame = 0;
      const pulseTimer = window.setInterval(() => {
        if (!map.getLayer('sites-critical-pulse')) return;
        pulseFrame += 1;
        const phase = (Math.sin(pulseFrame / 24) + 1) / 2;
        map.setPaintProperty('sites-critical-pulse', 'circle-radius', ['+', ['get','markerRadius'], 2 + phase * 2]);
        map.setPaintProperty('sites-critical-pulse', 'circle-stroke-opacity', 0.12 + phase * 0.18);
      }, 120);
      map.once('remove', () => window.clearInterval(pulseTimer));

      let hoveredSiteId: string | number | undefined;
      map.on('mousemove', 'sites-dots', e => {
        const featureId = e.features?.[0]?.id;
        if (featureId === undefined || featureId === hoveredSiteId) return;
        if (hoveredSiteId !== undefined) map.setFeatureState({ source: 'sites', id: hoveredSiteId }, { hover: false });
        hoveredSiteId = featureId;
        map.setFeatureState({ source: 'sites', id: featureId }, { hover: true });
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'sites-dots', () => {
        if (hoveredSiteId !== undefined) map.setFeatureState({ source: 'sites', id: hoveredSiteId }, { hover: false });
        hoveredSiteId = undefined;
        map.getCanvas().style.cursor = '';
      });

      // ── Popup helpers ──
      const pStyle = `background:rgba(12,14,26,0.95);backdrop-filter:blur(16px);border-radius:10px;padding:16px;font-family:'JetBrains Mono',monospace;`;

      const popup = (coords: any, html: string) => {
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '380px', offset: 14 })
          .setLngLat(coords).setHTML(html).addTo(map);
      };

      // ── Click: Exposure Findings ──
      map.on('click', 'exposure-dots', e => {
        const p = e.features?.[0]?.properties as any;
        if (!p) return;
        const coords = (e.features![0].geometry as any).coordinates;
        const color = p.severity === 'CRITICAL' ? '#EF4444' : p.severity === 'HIGH' ? '#F59E0B' : p.severity === 'MEDIUM' ? '#F59E0B' : '#22D3EE';
        popup(coords, `<div style="${pStyle}border:1px solid ${color}40;">
          <div style="color:${color};font-size:13px;font-weight:700;margin-bottom:8px;">⚠ EXPOSURE FINDINGS — ${p.name}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;font-size:10px;margin-bottom:8px;">
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">FINDINGS</span><br/><span style="color:${color};font-weight:bold;">${p.findings}</span></div>
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">CRITICALS</span><br/><span style="color:#EF4444;font-weight:bold;">${p.criticals}</span></div>
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">SEVERITY</span><br/><span style="color:${color};">${p.severity}</span></div>
          </div>
          <div style="font-size:9px;color:rgba(255,255,255,0.4);">Region: <span style="color:rgba(255,255,255,0.95);">${p.region}</span></div>
        </div>`);
        onEntityClick?.(p);
      });

      // ── Click: App Assurance ──
      map.on('click', 'assurance-dots', e => {
        const p = e.features?.[0]?.properties as any;
        if (!p) return;
        const coords = (e.features![0].geometry as any).coordinates;
        const color = p.severity === 'CRITICAL' ? '#EF4444' : p.severity === 'HIGH' ? '#F59E0B' : p.severity === 'MEDIUM' ? '#F59E0B' : '#10B981';
        popup(coords, `<div style="${pStyle}border:1px solid ${color}40;">
          <div style="color:#F59E0B;font-size:12px;font-weight:700;margin-bottom:6px;">🔍 APP ASSURANCE</div>
          <div style="color:rgba(255,255,255,0.95);font-size:11px;margin-bottom:8px;">${p.name}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:10px;">
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">APP</span><br/><span style="color:rgba(255,255,255,0.95);">${p.app}</span></div>
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">FINDINGS</span><br/><span style="color:${color};font-weight:bold;">${p.findings}</span></div>
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">SEVERITY</span><br/><span style="color:${color};">${p.severity}</span></div>
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">STATUS</span><br/><span style="color:rgba(255,255,255,0.95);">${p.status}</span></div>
          </div>
        </div>`);
      });

      // ── Click: Architecture Reviews ──
      map.on('click', 'arch-circles', e => {
        const p = e.features?.[0]?.properties as any;
        if (!p) return;
        const coords = (e.features![0].geometry as any).coordinates;
        const sc = parseFloat(p.score);
        const color = sc >= 4.5 ? '#10B981' : sc >= 3.5 ? '#F59E0B' : '#F59E0B';
        popup(coords, `<div style="${pStyle}border:1px solid ${color}40;">
          <div style="color:#F59E0B;font-size:12px;font-weight:700;margin-bottom:6px;">🏛 ARCHITECTURE REVIEW</div>
          <div style="color:rgba(255,255,255,0.95);font-size:11px;margin-bottom:8px;">${p.name}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:10px;">
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">TYPE</span><br/><span style="color:rgba(255,255,255,0.95);">${p.type}</span></div>
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">SCORE</span><br/><span style="color:${color};font-weight:bold;">${sc}/5.0</span></div>
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">STATUS</span><br/><span style="color:rgba(255,255,255,0.95);">${p.status}</span></div>
          </div>
        </div>`);
      });

      // ── Click: DLP Sites ──
      map.on('click', 'dlp-dots', e => {
        const p = e.features?.[0]?.properties as any;
        if (!p) return;
        const coords = (e.features![0].geometry as any).coordinates;
        popup(coords, `<div style="${pStyle}border:1px solid #22D3EE40;">
          <div style="color:#22D3EE;font-size:12px;font-weight:700;margin-bottom:6px;">🔒 DLP ENFORCEMENT POINT</div>
          <div style="color:rgba(255,255,255,0.95);font-size:11px;margin-bottom:8px;">${p.name}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:10px;">
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">TYPE</span><br/><span style="color:#22D3EE;">${(p.type||'').toUpperCase()}</span></div>
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">POLICIES</span><br/><span style="color:rgba(255,255,255,0.95);font-weight:bold;">${p.policies}</span></div>
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">REGION</span><br/><span style="color:rgba(255,255,255,0.95);">${p.country}</span></div>
          </div>
        </div>`);
      });

      // ── Click: DLP Chokepoints ──
      map.on('click', 'dlp-choke-dots', e => {
        const p = e.features?.[0]?.properties as any;
        if (!p) return;
        const coords = (e.features![0].geometry as any).coordinates;
        const rc = p.risk === 'CRITICAL' ? '#EF4444' : p.risk === 'HIGH' ? '#F59E0B' : '#F59E0B';
        popup(coords, `<div style="${pStyle}border:1px solid ${rc}40;">
          <div style="color:#F59E0B;font-size:12px;font-weight:700;margin-bottom:6px;">⚡ DATA FLOW CORRIDOR</div>
          <div style="color:rgba(255,255,255,0.95);font-size:11px;margin-bottom:8px;">${p.name}</div>
          <div style="font-size:9px;color:#aaa;">Volume: <span style="color:#fff;">${p.traffic}</span></div>
          <div style="font-size:9px;color:#aaa;">Risk: <span style="color:${rc};font-weight:bold;">${p.risk}</span></div>
        </div>`);
      });

      // ── Click: IT Assets ──
      map.on('click', 'it-dots', e => {
        const p = e.features?.[0]?.properties as any;
        if (!p) return;
        const coords = (e.features![0].geometry as any).coordinates;
        popup(coords, `<div style="${pStyle}border:1px solid #10B98140;">
          <div style="color:#10B981;font-size:12px;font-weight:700;margin-bottom:6px;">🖥 IT ASSET CLUSTER</div>
          <div style="color:rgba(255,255,255,0.95);font-size:11px;margin-bottom:8px;">${p.site}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:10px;">
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">CATEGORY</span><br/><span style="color:#10B981;">${(p.category||'').toUpperCase()}</span></div>
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">TOTAL ASSETS</span><br/><span style="color:rgba(255,255,255,0.95);font-weight:bold;">${(p.total_assets||0).toLocaleString()}</span></div>
          </div>
        </div>`);
        onEntityClick?.(p);
      });

      // ── Click: Simulated Campaigns ──
      map.on('click', 'campaign-dots', e => {
        const p = e.features?.[0]?.properties as any;
        if (!p) return;
        const coords = (e.features![0].geometry as any).coordinates;
        const cr = parseFloat(p.click_rate);
        const color = cr > 10 ? '#EF4444' : cr > 6 ? '#F59E0B' : cr > 3 ? '#F59E0B' : '#10B981';
        popup(coords, `<div style="${pStyle}border:1px solid #22D3EE40;">
          <div style="color:#22D3EE;font-size:12px;font-weight:700;margin-bottom:6px;">📧 SIMULATED CAMPAIGN</div>
          <div style="color:rgba(255,255,255,0.95);font-size:11px;margin-bottom:8px;">${p.title || p.id}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;font-size:10px;">
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">CLICK RATE</span><br/><span style="color:${color};font-weight:bold;">${cr}%</span></div>
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">SENT</span><br/><span style="color:rgba(255,255,255,0.95);">${(p.sent||0).toLocaleString()}</span></div>
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">CLICKED</span><br/><span style="color:${color};">${p.clicked||0}</span></div>
          </div>
        </div>`);
      });

      // ── Click: Access Recertification ──
      map.on('click', 'access-dots', e => {
        const p = e.features?.[0]?.properties as any;
        if (!p) return;
        const coords = (e.features![0].geometry as any).coordinates;
        const color = p.severity === 'critical' ? '#EF4444' : p.severity === 'high' ? '#F59E0B' : '#F59E0B';
        popup(coords, `<div style="${pStyle}border:1px solid ${color}40;">
          <div style="color:#EF4444;font-size:12px;font-weight:700;margin-bottom:6px;">🔑 ACCESS RECERTIFICATION</div>
          <div style="color:rgba(255,255,255,0.95);font-size:11px;margin-bottom:8px;">${p.name}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:10px;">
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">OVERDUE</span><br/><span style="color:${color};font-weight:bold;">${p.overdue}</span></div>
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">DEPT</span><br/><span style="color:rgba(255,255,255,0.95);">${p.dept}</span></div>
          </div>
        </div>`);
      });

      // ── Click: App Governance ──
      map.on('click', 'gov-dots', e => {
        const p = e.features?.[0]?.properties as any;
        if (!p) return;
        const coords = (e.features![0].geometry as any).coordinates;
        const color = p.status === 'Non-Compliant' ? '#EF4444' : p.status === 'At Risk' || p.status === 'Review Due' ? '#F59E0B' : '#10B981';
        popup(coords, `<div style="${pStyle}border:1px solid ${color}40;">
          <div style="color:${color};font-size:12px;font-weight:700;margin-bottom:6px;">📱 APP GOVERNANCE</div>
          <div style="color:rgba(255,255,255,0.95);font-size:11px;margin-bottom:8px;">${p.name}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:10px;">
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">STATUS</span><br/><span style="color:${color};">${p.status}</span></div>
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">RISK</span><br/><span style="color:rgba(255,255,255,0.95);">${p.risk}</span></div>
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">FINDINGS</span><br/><span style="color:rgba(255,255,255,0.95);">${p.findings}</span></div>
          </div>
        </div>`);
      });

      // ── Click: Activity Retention ──
      map.on('click', 'retention-dots', e => {
        const p = e.features?.[0]?.properties as any;
        if (!p) return;
        const coords = (e.features![0].geometry as any).coordinates;
        const color = p.status === 'Non-Compliant' ? '#EF4444' : p.status === 'Gap Detected' ? '#F59E0B' : '#10B981';
        popup(coords, `<div style="${pStyle}border:1px solid ${color}40;">
          <div style="color:#22D3EE;font-size:12px;font-weight:700;margin-bottom:6px;">📋 ACTIVITY RETENTION</div>
          <div style="color:rgba(255,255,255,0.95);font-size:11px;margin-bottom:8px;">${p.name}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;font-size:10px;">
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">COVERAGE</span><br/><span style="color:${color};font-weight:bold;">${p.coverage_pct}%</span></div>
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">DAYS</span><br/><span style="color:rgba(255,255,255,0.95);">${p.days_retained}/180</span></div>
            <div><span style="color:rgba(255,255,255,0.4);font-size:9px;">STATUS</span><br/><span style="color:${color};">${p.status}</span></div>
          </div>
        </div>`);
      });

      // ── Generic hover cursor ──
      const clickable = ['exposure-dots','assurance-dots','arch-circles','dlp-dots','dlp-choke-dots','it-dots','campaign-dots','access-dots','gov-dots','retention-dots'];
      clickable.forEach(l => {
        map.on('mouseenter', l, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', l, () => { map.getCanvas().style.cursor = ''; });
      });

      // Site marker click — fire callback (flyTo happens in parent via flyToLocation)
      map.on('click', 'sites-dots', e => {
        const p = e.features?.[0]?.properties as any;
        if (!p) return;
        popupRef.current?.remove();
        onSiteClickRef.current?.(p.siteId, parseFloat(p.lat), parseFloat(p.lng));
      });

      // Events
      let lastMove = 0;
      map.on('mousemove', e => {
        const now = Date.now();
        if (now - lastMove > 300) { lastMove = now; onMouseCoords?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }); }
      });
      map.on('contextmenu', e => { e.preventDefault(); onRightClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }); });
      map.on('moveend', () => { const c = map.getCenter(); onViewStateChange?.({ zoom: map.getZoom(), latitude: c.lat }); });

      setMapReady(true);
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Projection
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    try {
      if (projection === 'globe') (map as any).setProjection?.({ type: 'globe' });
      else (map as any).setProjection?.({ type: 'mercator' });
    } catch { /* projection not supported in this build */ }
  }, [mapReady, projection]);

  // Map style (dark ↔ satellite)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (mapStyle === prevStyleRef.current) return;
    prevStyleRef.current = mapStyle;
    const newStyle = mapStyle.startsWith('http')
      ? { version: 8 as const, sources: { imagery: { type: 'raster' as const, tiles: [mapStyle], tileSize: 256 } }, layers: [{ id: 'bg', type: 'raster' as const, source: 'imagery' }] }
      : DEFAULT_DARK_MAP_STYLE;
    map.setStyle(newStyle as any);
  }, [mapReady, mapStyle]);

  // Fly-to
  useEffect(() => {
    if (!mapReady || !flyToLocation || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [flyToLocation.lng, flyToLocation.lat],
      zoom: flyToLocation.zoom ?? 5,
      duration: flyToLocation.zoom ? 1100 : 1800,
      easing: (t) => t < 0.5 ? 2*t*t : -1+(4-2*t)*t,
      essential: true,
    });
  }, [mapReady, flyToLocation]);

  // Day/Night
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const update = () => {
      const src = map.getSource('day-night') as any;
      if (!src) return;
      if (!activeLayers.day_night) { src.setData(EMPTY_FC); return; }
      src.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [computeSolarTerminator()] }, properties: {} }] });
    };
    update();
    const iv = setInterval(update, 300000);
    return () => clearInterval(iv);
  }, [mapReady, activeLayers.day_night]);

  const setGeo = useCallback((source: string, features: any[]) => {
    const src = mapRef.current?.getSource(source) as any;
    if (src) src.setData({ type: 'FeatureCollection', features });
  }, []);

  const setVis = useCallback((ids: string[], visible: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    ids.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none'); });
  }, []);

  // ── Data → GeoJSON (each domain decoupled) ──
  useEffect(() => {
    if (!mapReady) return;
    setGeo('exposure', activeLayers.exposure && data.exposure_sites
      ? data.exposure_sites.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: s }))
      : []);
  }, [mapReady, data.exposure_sites, activeLayers.exposure, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('app-assurance', activeLayers.app_assurance && data.assurance_events
      ? data.assurance_events.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: s }))
      : []);
  }, [mapReady, data.assurance_events, activeLayers.app_assurance, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('arch-reviews', activeLayers.arch_reviews && data.arch_sites
      ? data.arch_sites.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: s }))
      : []);
  }, [mapReady, data.arch_sites, activeLayers.arch_reviews, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('dlp', activeLayers.dlp && data.dlp_sites
      ? data.dlp_sites.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: s }))
      : []);
    setGeo('dlp-events', activeLayers.dlp && data.dlp_events
      ? data.dlp_events.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: s }))
      : []);
    setGeo('dlp-choke', activeLayers.dlp && data.dlp_chokepoints
      ? data.dlp_chokepoints.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: s }))
      : []);
  }, [mapReady, data.dlp_sites, data.dlp_events, data.dlp_chokepoints, activeLayers.dlp, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('ot-assets', activeLayers.ot_assets && data.ot_assets
      ? data.ot_assets.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: s }))
      : []);
  }, [mapReady, data.ot_assets, activeLayers.ot_assets, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('it-assets', activeLayers.it_assets && data.it_assets
      ? data.it_assets.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: s }))
      : []);
  }, [mapReady, data.it_assets, activeLayers.it_assets, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('campaigns', activeLayers.sim_campaigns && data.campaign_events
      ? data.campaign_events.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: s }))
      : []);
  }, [mapReady, data.campaign_events, activeLayers.sim_campaigns, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    const items = data.news || [];
    setGeo('awareness', activeLayers.awareness && items.length
      ? items.filter((n: any) => Array.isArray(n.coords) && n.coords.length === 2)
          .map((n: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [n.coords[1], n.coords[0]] }, properties: { title: n.title, source: n.source, risk_score: n.risk_score } }))
      : []);
  }, [mapReady, data.news, activeLayers.awareness, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('access-recert', activeLayers.access_recert && data.access_events
      ? data.access_events.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: s }))
      : []);
  }, [mapReady, data.access_events, activeLayers.access_recert, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('app-governance', activeLayers.app_governance && data.governance_apps
      ? data.governance_apps.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: s }))
      : []);
  }, [mapReady, data.governance_apps, activeLayers.app_governance, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('retention', activeLayers.activity_retention && data.retention_sites
      ? data.retention_sites.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: s }))
      : []);
  }, [mapReady, data.retention_sites, activeLayers.activity_retention, setGeo]);

  // ── Site markers data ──
  useEffect(() => {
    if (!mapReady) return;
    setGeo('sites', sitesData
      ? sitesData.map(s => {
          const worstStatus = getWorstSiteStatus(s);
          const activityVolume = getSiteActivityVolume(s);
          return {
            type: 'Feature',
            id: s.id,
            geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
            properties: {
              siteId: s.id,
              id: s.id,
              lat: s.lat,
              lng: s.lng,
              name: s.name,
              postureScore: s.postureScore,
              status: worstStatus,
              statusColor: STATUS_COLORS[worstStatus],
              markerRadius: getMarkerRadius(activityVolume),
              activityVolume,
              region: s.region,
            },
          };
        })
      : []);
  }, [mapReady, sitesData, setGeo]);

  // ── Selected site ring ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (map.getLayer('sites-ring')) {
      map.setFilter('sites-ring', selectedSiteId
        ? ['==', ['get', 'id'], selectedSiteId]
        : ['==', '1', '0']);
    }
  }, [mapReady, selectedSiteId]);

  // ── Layer visibility ──
  useEffect(() => {
    if (!mapReady) return;
    setVis(['exposure-glow','exposure-dots','exposure-label'],               activeLayers.exposure);
    setVis(['assurance-glow','assurance-dots'],                              activeLayers.app_assurance);
    setVis(['arch-circles','arch-label'],                                    activeLayers.arch_reviews);
    setVis(['dlp-glow','dlp-dots','dlp-label','dlp-events-dots','dlp-choke-glow','dlp-choke-dots','dlp-choke-label'], activeLayers.dlp);
    setVis(['ot-heat'],                                                      activeLayers.ot_assets);
    setVis(['it-glow','it-dots'],                                            activeLayers.it_assets);
    setVis(['campaign-glow','campaign-dots','campaign-label'],               activeLayers.sim_campaigns);
    setVis(['awareness-glow','awareness-dots'],                              activeLayers.awareness);
    setVis(['access-glow','access-dots'],                                    activeLayers.access_recert);
    setVis(['gov-dots'],                                                     activeLayers.app_governance);
    setVis(['retention-glow','retention-dots','retention-label'],            activeLayers.activity_retention);
    setVis(['day-night-fill'],                                               activeLayers.day_night);
  }, [mapReady, activeLayers, setVis]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-[1] w-full h-full" style={{ background: '#05070A' }} />
  );
}

export default memo(CommandMap);
