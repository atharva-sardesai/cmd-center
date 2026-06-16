'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Newspaper, Search, X, Globe, MapPinned, Moon, Satellite, Shield, Wifi } from 'lucide-react';
import IntelFeed from '@/components/IntelFeed';
import SearchBar from '@/components/SearchBar';
import ScaleBar from '@/components/ScaleBar';
import ErrorBoundary from '@/components/ErrorBoundary';
import SharePanel from '@/components/SharePanel';
import ViewPresets from '@/components/ViewPresets';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import GlobalStatusBar from '@/components/GlobalStatusBar';
import { DEFAULT_ACTIVE_LAYERS } from '@/data/layerMap';
import { MASTER_SITES } from '@/data/sites';
import type { SiteRecord } from '@/data/sites';
import { INDIA_MAP_VIEW } from '@/lib/mapDefaults';

const CommandMap = dynamic(() => import('@/components/CommandMap'), { ssr: false });
const LayerPanel = dynamic(() => import('@/components/LayerPanel'));
const AnalyticsMapChrome = dynamic(() => import('@/components/AnalyticsMapChrome'), { ssr: false });

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setIsMobile(w < 768 || (h < 500 && w < 1024));
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);
  return isMobile;
}

const UptimeClock = () => {
  const [uptime, setUptime] = useState('00:00:00');
  const startTime = useRef(Date.now());
  useEffect(() => {
    const iv = setInterval(() => {
      const e = Math.floor((Date.now() - startTime.current) / 1000);
      setUptime(`${String(Math.floor(e/3600)).padStart(2,'0')}:${String(Math.floor((e%3600)/60)).padStart(2,'0')}:${String(e%60).padStart(2,'0')}`);
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  return <span className="hidden lg:inline-flex items-center gap-1 font-mono text-[14px] font-normal tabular-nums text-[var(--text-secondary)]"><span className="text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">UPTIME</span> {uptime}</span>;
};

const ZuluClock = () => {
  const [time, setTime] = useState('');
  useEffect(() => {
    const iv = setInterval(() => {
      const now = new Date();
      setTime(`ZULU ${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}:${String(now.getUTCSeconds()).padStart(2,'0')}Z`);
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  return <span className="font-mono text-[14px] font-normal tabular-nums text-[var(--accent-primary)]">{time || 'ZULU --:--:--Z'}</span>;
};



export default function Dashboard() {
  const dataRef = useRef<any>({});
  const [dataVersion, setDataVersion] = useState(0);
  const data = dataRef.current;

  const [backendStatus, setBackendStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [mapView, setMapView] = useState({ zoom: 2.0, latitude: 20 });
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number; ts: number; zoom?: number } | null>(null);
  const [mouseCoords, setMouseCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [, setLocationLabel] = useState('');
  const [regionDossier, setRegionDossier] = useState<any>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [, setShowLayers] = useState(true);
  const [, setShowIntel] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<'layers'|'intel'|'search'|null>(null);
  const [mapProjection, setMapProjection] = useState<'globe'|'mercator'>('globe');
  const [mapStyle, setMapStyle] = useState<'dark'|'satellite'>('dark');

  const isMobile = useIsMobile();
  const geocodeCache = useRef<Map<string, string>>(new Map());
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGeocodedPos = useRef<{ lat: number; lng: number } | null>(null);

  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(Object.keys(DEFAULT_ACTIVE_LAYERS).map(key => [key, false]))
  );
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const selectedSite = selectedSiteId ? MASTER_SITES.find(s => s.id === selectedSiteId) ?? null : null;

  // Splash
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(t);
  }, []);

  // URL state: parse on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    const lat = parseFloat(p.get('lat') || '');
    const lon = parseFloat(p.get('lon') || '');
    const zoom = parseFloat(p.get('zoom') || '');
    if (!isNaN(lat) && !isNaN(lon)) {
      setFlyToLocation({ lat, lng: lon, ts: Date.now() });
      if (!isNaN(zoom)) setMapView(v => ({ ...v, zoom }));
    }
    const layers = p.get('layers');
    if (layers) {
      const active = layers.split(',');
      setActiveLayers(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { (next as any)[k] = active.includes(k); });
        return next;
      });
    }
  }, []);

  // URL state: update on view change
  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (urlTimer.current) clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => {
      const p = new URLSearchParams();
      p.set('lat', (mouseCoords?.lat ?? mapView.latitude ?? 20).toFixed(4));
      p.set('lon', (mouseCoords?.lng ?? 0).toFixed(4));
      p.set('zoom', mapView.zoom.toFixed(2));
      const active = Object.entries(activeLayers).filter(([,v]) => v).map(([k]) => k).join(',');
      p.set('layers', active);
      window.history.replaceState(null, '', `${window.location.pathname}?${p.toString()}`);
    }, 1500);
  }, [mapView, activeLayers, mouseCoords]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) return;
      if (e.key === 'Escape') {
        setSelectedSiteId(null);
        setFlyToLocation({ ...INDIA_MAP_VIEW, ts: Date.now() });
        return;
      }
      if (e.key === 'f' && !e.ctrlKey) {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      }
      if (e.key === 'l') setShowLayers(p => !p);
      if (e.key === 'i') setShowIntel(p => !p);
      if (e.key === 'r') setFlyToLocation({ ...INDIA_MAP_VIEW, ts: Date.now() });
      if (e.key === 'g') setMapProjection(p => p === 'globe' ? 'mercator' : 'globe');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Mouse coords + reverse geocode (Nominatim — CDN, see README)
  const handleMouseCoords = useCallback((coords: { lat: number; lng: number }) => {
    setMouseCoords(coords);
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      if (lastGeocodedPos.current) {
        const d = Math.abs(coords.lat - lastGeocodedPos.current.lat) + Math.abs(coords.lng - lastGeocodedPos.current.lng);
        if (d < 0.5) return;
      }
      const gk = `${coords.lat.toFixed(1)},${coords.lng.toFixed(1)}`;
      if (geocodeCache.current.has(gk)) { setLocationLabel(geocodeCache.current.get(gk)!); lastGeocodedPos.current = coords; return; }
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&zoom=10&addressdetails=1`, { headers: { 'Accept-Language': 'en' } });
        if (res.ok) {
          const d = await res.json();
          const a = d.address || {};
          const label = [a.city||a.town||a.village||a.county, a.state||a.region, a.country].filter(Boolean).join(', ') || 'Unknown';
          if (geocodeCache.current.size > 500) { const it = geocodeCache.current.keys(); for (let i=0;i<100;i++) { const k = it.next().value; if(k) geocodeCache.current.delete(k); }}
          geocodeCache.current.set(gk, label);
          setLocationLabel(label);
          lastGeocodedPos.current = coords;
        }
      } catch (e) { console.warn('[Sentinel] Suppressed error:', e instanceof Error ? e.message : e); }
    }, 3000);
  }, []);

  // Region dossier (right-click)
  const handleRightClick = useCallback(async (coords: { lat: number; lng: number }) => {
    setDossierLoading(true); setRegionDossier(null);
    try {
      const res = await fetch(`/api/region-dossier?lat=${coords.lat}&lng=${coords.lng}`);
      if (res.ok) setRegionDossier(await res.json());
    } catch (e) { console.warn('[Sentinel] Suppressed error:', e instanceof Error ? e.message : e); } finally { setDossierLoading(false); }
  }, []);

  // Shared fetch utility
  const fetchEndpoint = useCallback(async (url: string, transform?: (d: any) => any) => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const d = transform ? transform(json) : json;
        dataRef.current = { ...dataRef.current, ...d };
        setDataVersion(v => v + 1);
        setBackendStatus('connected');
      }
    } catch (e) {
      console.warn('[Sentinel] Suppressed error:', e instanceof Error ? e.message : e);
      setBackendStatus('error');
    }
  }, []);

  // Load all domain data on mount — all routes are local mocks
  useEffect(() => {
    fetchEndpoint('/api/news');
    fetchEndpoint('/api/country-risk', d => ({ posture_score: d.posture_score, country_risk_domains: d.domains }));

    const t = setTimeout(() => {
      fetchEndpoint('/api/flights', d => ({ exposure_sites: d.exposure_sites }));
      fetchEndpoint('/api/cyber-threats', d => ({ assurance_events: d.assurance_events, cyber_stats: d.stats }));
      fetchEndpoint('/api/earthquakes', d => ({ arch_sites: d.arch_sites }));
      fetchEndpoint('/api/maritime', d => ({ dlp_sites: d.dlp_sites, dlp_events: d.dlp_events, dlp_chokepoints: d.dlp_chokepoints }));
      fetchEndpoint('/api/fires', d => ({ ot_assets: d.ot_assets }));
      fetchEndpoint('/api/cctv', d => ({ it_assets: d.it_assets }));
      fetchEndpoint('/api/weather', d => ({ campaign_events: d.campaign_events }));
      fetchEndpoint('/api/live-news', d => ({ retention_sites: d.retention_sites }));
      fetchEndpoint('/api/gdelt', d => ({ access_events: d.access_events }));
      fetchEndpoint('/api/satellites', d => ({ governance_apps: d.governance_apps }));
    }, 600);

    // Refresh activity feed every 30 min (mock data, so just keeps timestamps fresh)
    const iv = setInterval(() => fetchEndpoint('/api/news'), 1800000);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [fetchEndpoint]);

  // Void dataVersion to keep ESLint quiet — re-read data on each render via dataRef
  void dataVersion;

  return (
    <main className="fixed inset-0 w-full h-full bg-[var(--bg-void)] overflow-hidden">

      {/* ── SPLASH ── */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="absolute inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at center, #0B0E14 0%, var(--bg-void) 70%)' }}
          >
            <div className="absolute inset-0 pointer-events-none z-[1]" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.012) 2px, rgba(0,229,255,0.012) 4px)',
              animation: 'splashScanDrift 8s linear infinite',
            }} />

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 0.8, duration: 0.5 }}
              className="absolute top-6 left-6 z-[2] font-mono text-[12px] tracking-[0.3em] text-[var(--cyan-primary)]">
              DEMO MODE
            </motion.div>

            {/* Geometric logo */}
            <div className="relative w-40 h-40 mb-8 flex items-center justify-center z-[2]">
              <motion.div
                initial={{ opacity: 0, scale: 0.6, rotate: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: 360 }}
                transition={{ opacity: { duration: 0.6 }, scale: { duration: 0.8, ease: 'easeOut' }, rotate: { duration: 20, repeat: Infinity, ease: 'linear' } }}
                className="absolute inset-0 rounded-full"
                style={{ border: '1px solid rgba(0,229,255,0.2)' }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ background: 'var(--cyan-primary)', boxShadow: '0 0 12px var(--cyan-primary), 0 0 24px rgba(0,229,255,0.3)' }} />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1 h-1 rounded-full" style={{ background: 'rgba(0,229,255,0.5)' }} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.4, rotate: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: -360 }}
                transition={{ opacity: { duration: 0.6, delay: 0.15 }, scale: { duration: 0.8, delay: 0.15, ease: 'easeOut' }, rotate: { duration: 12, repeat: Infinity, ease: 'linear' } }}
                className="absolute rounded-full"
                style={{ inset: '18px', border: '1px solid rgba(0,229,255,0.15)' }}
              >
                <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cyan-primary)', boxShadow: '0 0 10px var(--cyan-primary)' }} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.2, rotate: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: 360 }}
                transition={{ opacity: { duration: 0.6, delay: 0.3 }, scale: { duration: 0.8, delay: 0.3, ease: 'easeOut' }, rotate: { duration: 7, repeat: Infinity, ease: 'linear' } }}
                className="absolute rounded-full"
                style={{ inset: '40px', border: '1px solid rgba(0,229,255,0.25)' }}
              >
                <div className="absolute top-0 left-1/4 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cyan-primary)', boxShadow: '0 0 8px var(--cyan-primary)' }} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                className="relative w-12 h-12 rounded-full flex items-center justify-center"
                style={{ border: '2px solid var(--cyan-primary)', boxShadow: '0 0 20px rgba(0,229,255,0.15), inset 0 0 20px rgba(0,229,255,0.05)' }}
              >
                <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-5 h-5 rounded-full" style={{ background: 'radial-gradient(circle, rgba(0,229,255,0.4) 0%, rgba(0,229,255,0.05) 70%)' }} />
                <div className="absolute w-[1px] h-full" style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,229,255,0.3), transparent)' }} />
                <div className="absolute w-full h-[1px]" style={{ background: 'linear-gradient(to right, transparent, rgba(0,229,255,0.3), transparent)' }} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.15, 0], rotate: [0, 360] }}
                transition={{ opacity: { duration: 3, repeat: Infinity }, rotate: { duration: 3, repeat: Infinity, ease: 'linear' }, delay: 0.6 }}
                className="absolute inset-[10px] rounded-full"
                style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgba(0,229,255,0.15) 40deg, transparent 80deg)' }}
              />
            </div>

            {/* Title */}
            <div className="flex items-center gap-[2px] mb-3 z-[2]">
              {'SENTINEL'.split('').map((letter, i) => (
                <motion.span key={i}
                  initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.5 + i * 0.07, duration: 0.5, ease: 'easeOut' }}
                  className="text-[32px] md:text-[32px] font-bold tracking-[0.5em] font-mono"
                  style={{ color: 'var(--text-heading)', textShadow: '0 0 30px rgba(0,229,255,0.2)' }}
                >
                  {letter}
                </motion.span>
              ))}
            </div>

            {/* Subtitle */}
            <div className="overflow-hidden mb-8 z-[2]">
              <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ delay: 1.2, duration: 0.8, ease: 'easeInOut' }} className="overflow-hidden whitespace-nowrap">
                <p className="text-[12px] md:text-[12px] font-mono tracking-[0.5em] text-[var(--cyan-primary)]" style={{ opacity: 0.8 }}>
                  SECURITY COMMAND CENTER
                </p>
              </motion.div>
            </div>

            {/* Progress bar */}
            <div className="w-64 md:w-80 z-[2]">
              <div className="relative w-full h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(0,229,255,0.1)' }}>
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: ['0%', '25%', '50%', '78%', '100%'] }}
                  transition={{ duration: 2.2, delay: 0.5, times: [0, 0.25, 0.5, 0.75, 1], ease: 'easeInOut' }}
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: 'linear-gradient(90deg, var(--cyan-primary), rgba(0,229,255,0.6), var(--cyan-primary))', boxShadow: '0 0 12px rgba(0,229,255,0.4)' }}
                />
              </div>
              <div className="mt-3 h-4 flex items-center justify-center">
                {[
                  { text: 'LOADING DOMAIN DATA...', delay: 0.5 },
                  { text: 'INITIALIZING MAP...', delay: 1.1 },
                  { text: 'CALIBRATING POSTURE INDEX...', delay: 1.7 },
                  { text: 'SYSTEM READY', delay: 2.2 },
                ].map((stage, i) => (
                  <motion.span key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{ delay: stage.delay, duration: 0.6, times: [0, 0.1, 0.7, 1] }}
                    className="absolute text-[12px] font-mono tracking-[0.25em]"
                    style={{ color: i === 3 ? 'var(--cyan-primary)' : 'var(--text-muted)' }}
                  >
                    {stage.text}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Decorative grid */}
            <div className="absolute inset-0 pointer-events-none z-[0]" style={{ opacity: 0.03 }}>
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(rgba(0,229,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.5) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
              }} />
            </div>

            {[
              { t: '10px', l: '10px', bw: '2px 0 0 2px' },
              { t: '10px', r: '10px', bw: '2px 2px 0 0' },
              { b: '10px', l: '10px', bw: '0 0 2px 2px' },
              { b: '10px', r: '10px', bw: '0 2px 2px 0' },
            ].map((pos, i) => (
              <motion.div key={i}
                initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                className="absolute w-8 h-8 z-[2]"
                style={{ top: (pos as any).t, bottom: (pos as any).b, left: (pos as any).l, right: (pos as any).r, borderWidth: pos.bw, borderStyle: 'solid', borderColor: 'var(--cyan-primary)' }}
              />
            ))}

            <style>{`
              @keyframes splashScanDrift {
                0% { background-position: 0 0; }
                100% { background-position: 0 100vh; }
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.06)_0%,rgba(34,211,238,0.025)_18%,transparent_40%)]" aria-hidden="true" />

      {/* ── MAP ── */}
      <ErrorBoundary name="Map">
        <CommandMap
          data={data}
          activeLayers={activeLayers}
          projection={mapProjection}
          mapStyle={mapStyle === 'satellite' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'dark'}
          onEntityClick={() => {}}
          onSiteClick={(site: SiteRecord) => {
            setSelectedSiteId(site.id);
            setFlyToLocation({ lat: site.lat, lng: site.lng, ts: Date.now(), zoom: 6 });
          }}
          selectedSiteId={selectedSiteId}
          sitesData={MASTER_SITES}
          onMouseCoords={handleMouseCoords}
          onRightClick={handleRightClick}
          onViewStateChange={setMapView}
          flyToLocation={flyToLocation}
        />
      </ErrorBoundary>

      {/* ── MAP VIEW CONTROLS ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.5 }}
        className="absolute bottom-[75px] md:bottom-6 left-3 md:left-[355px] z-[200] flex items-center gap-2 pointer-events-none"
      >
        <button
          onClick={() => setMapProjection(p => p === 'globe' ? 'mercator' : 'globe')}
          className="glass-panel p-2.5 pointer-events-auto hover:border-[var(--cyan-primary)]/40 transition-colors group relative"
          title={mapProjection === 'globe' ? 'Switch to 2D Map' : 'Switch to 3D Globe'}
        >
          {mapProjection === 'globe'
            ? <MapPinned className="w-4 h-4 text-[var(--cyan-primary)] group-hover:scale-110 transition-transform" />
            : <Globe className="w-4 h-4 text-[var(--cyan-primary)] group-hover:scale-110 transition-transform" />}
          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 text-[12px] font-mono text-[var(--text-muted)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity glass-panel px-2 py-1 z-[300]">
            {mapProjection === 'globe' ? '2D MAP' : '3D GLOBE'}
          </span>
        </button>

        <button
          onClick={() => setMapStyle(s => s === 'dark' ? 'satellite' : 'dark')}
          className="glass-panel p-2.5 pointer-events-auto hover:border-[var(--cyan-primary)]/40 transition-colors group relative"
          title={mapStyle === 'dark' ? 'Satellite View' : 'Night View'}
        >
          {mapStyle === 'dark'
            ? <Satellite className="w-4 h-4 text-[var(--alert-green)] group-hover:scale-110 transition-transform" />
            : <Moon className="w-4 h-4 text-[var(--cyan-primary)] group-hover:scale-110 transition-transform" />}
          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 text-[12px] font-mono text-[var(--text-muted)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity glass-panel px-2 py-1 z-[300]">
            {mapStyle === 'dark' ? 'SATELLITE' : 'NIGHT MODE'}
          </span>
        </button>
      </motion.div>

      {/* ── HEADER ── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 2.5 }}
        className="absolute left-0 right-0 top-0 z-[220] flex h-[52px] items-center justify-between px-5 pointer-events-none"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex h-8 w-8 items-center justify-center">
            <div className="absolute inset-[-4px] rounded-full border border-[var(--accent-primary)]/20" style={{ animation: 'sentinel-rotate 12s linear infinite' }} />
            <div className="h-7 w-7 rounded-full border-2 border-[var(--accent-primary)] flex items-center justify-center animate-glow-pulse">
              <div className="h-3 w-3 rounded-full bg-[var(--accent-primary)]/30 border border-[var(--accent-primary)]/60" />
            </div>
            <div className="absolute h-full w-px bg-[var(--accent-primary)]/30" />
            <div className="absolute h-px w-full bg-[var(--accent-primary)]/30" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-mono text-[18px] font-medium tracking-[0.5em] text-[var(--text-primary)]">SENTINEL</h1>
            <span className="font-mono text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--accent-primary)]">Command Center</span>
          </div>
        </div>

        <div className="hidden items-center gap-6 lg:flex font-mono text-[14px] font-normal tabular-nums text-[var(--text-secondary)]">
          <ZuluClock />
          <span className="flex items-center gap-1">
            <span className="text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">SYS:</span>
            <span className={backendStatus === 'connected' ? 'text-[var(--status-healthy)]' : 'text-[var(--status-critical)]'}>{backendStatus.toUpperCase()}</span>
          </span>
          {data.posture_score !== undefined && (
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-[var(--accent-primary)]" />
              <span className="text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">POSTURE</span>
              <span style={{ color: data.posture_score >= 80 ? 'var(--status-healthy)' : data.posture_score >= 65 ? 'var(--status-watch)' : 'var(--status-critical)' }}>
                {data.posture_score}/100
              </span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <Wifi className="h-3 w-3 text-[var(--accent-primary)]" />
            <span>{Object.values(activeLayers).filter(Boolean).length}</span>
            <span className="text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">FEEDS</span>
          </span>
          <UptimeClock />
        </div>
      </motion.header>

      {/* ── MOBILE: Compact top status ── */}
      {isMobile && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}
          className="absolute top-3 right-3 z-[200] pointer-events-auto flex items-center gap-2">
          <div className="glass-panel px-2 py-1 flex items-center gap-1.5 text-[12px] font-mono tracking-widest">
            <div className="w-1 h-1 rounded-full bg-[var(--alert-green)] animate-sentinel-pulse" />
            <span className="text-[var(--alert-green)] font-bold">LIVE</span>
          </div>
        </motion.div>
      )}

      {/* ── SHARED MAP ANALYTICS CHROME ── */}
      <AnalyticsMapChrome selectedSite={selectedSite} />

      {/* ═══ MOBILE UI ═══ */}
      {isMobile && (
        <>
          <div className="mobile-nav">
            <div className="glass-panel mobile-nav-inner">
              {[
                { id: 'layers' as const, icon: Layers, label: 'LAYERS' },
                { id: 'intel' as const, icon: Newspaper, label: 'INTEL' },
                { id: 'search' as const, icon: Search, label: 'SEARCH' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setMobilePanel(mobilePanel === tab.id ? null : tab.id)}
                  className={`mobile-nav-btn ${mobilePanel === tab.id ? 'active' : ''}`}>
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {mobilePanel && (
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed bottom-[52px] left-0 right-0 z-[400] glass-panel rounded-b-none overflow-y-auto styled-scrollbar"
                style={{ maxHeight: 'min(55vh, calc(100dvh - 100px))', paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}
              >
                <div className="mobile-drawer-handle" />
                <div className="px-3 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="hud-text text-[12px] text-[var(--text-primary)]">
                      {mobilePanel === 'layers' ? 'SECURITY DOMAINS' : mobilePanel === 'intel' ? 'ACTIVITY FEED' : 'SEARCH'}
                    </span>
                    <button onClick={() => setMobilePanel(null)} className="text-[var(--text-muted)] p-1"><X className="w-4 h-4" /></button>
                  </div>
                  {mobilePanel === 'layers' && (
                    <>
                      <div className="glass-panel-sm p-2 mb-2">
                        <div className="grid grid-cols-5 gap-1 text-center">
                          <div><div className="hud-label" style={{fontSize:'6px'}}>FINDINGS</div><div className="hud-value text-[12px]" style={{color:'var(--accent-primary)'}}>{selectedSite ? selectedSite.domains.exposure.findings : data.exposure_sites?.length||0}</div></div>
                          <div><div className="hud-label" style={{fontSize:'6px'}}>APPS</div><div className="hud-value text-[12px]">{selectedSite ? selectedSite.domains.app_assurance.findings : data.assurance_events?.length||0}</div></div>
                          <div><div className="hud-label" style={{fontSize:'6px'}}>ASSETS</div><div className="hud-value text-[12px]" style={{color:'var(--status-healthy)'}}>{selectedSite ? (selectedSite.domains.it_assets.servers+selectedSite.domains.it_assets.endpoints+selectedSite.domains.it_assets.network+selectedSite.domains.it_assets.cloud+selectedSite.domains.ot_assets.plcs+selectedSite.domains.ot_assets.hmis+selectedSite.domains.ot_assets.scada) : (data.it_assets?.length||0)+(data.ot_assets?.length||0)}</div></div>
                          <div><div className="hud-label" style={{fontSize:'6px'}}>CAMP</div><div className="hud-value text-[12px]" style={{color:'var(--accent-primary)'}}>{selectedSite ? selectedSite.domains.sim_campaigns.sent : data.campaign_events?.length||0}</div></div>
                          <div><div className="hud-label" style={{fontSize:'6px'}}>ACCESS</div><div className="hud-value text-[12px]" style={{color:'var(--status-watch)'}}>{selectedSite ? selectedSite.domains.access_recert.overdue : data.access_events?.length||0}</div></div>
                        </div>
                      </div>
                      <LayerPanel data={data} activeLayers={activeLayers} setActiveLayers={setActiveLayers} selectedSite={selectedSite} />
                      <div className="mt-2">
                        <ViewPresets onNavigate={(lat, lng, zoom) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMapView(v => ({ ...v, zoom })); setMobilePanel(null); }} />
                      </div>
                    </>
                  )}
                  {mobilePanel === 'intel' && <IntelFeed data={data} onLocate={(lat, lng) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMobilePanel(null); }} />}
                  {mobilePanel === 'search' && (
                    <div className="space-y-2">
                      <SearchBar onLocate={(lat, lng) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMobilePanel(null); }} />
                      <SharePanel mapView={mapView} activeLayers={activeLayers} mouseCoords={mouseCoords} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ── Scale Bar ── */}
      <div className="desktop-only absolute bottom-12 left-[20rem] z-[201] pointer-events-none">
        <ScaleBar zoom={mapView.zoom} latitude={mapView.latitude} />
      </div>

      {/* ── Region Dossier ── */}
      {(regionDossier || dossierLoading) && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-16 md:top-20 left-2 right-2 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[300] md:w-[480px] max-h-[65vh] overflow-y-auto styled-scrollbar">
          <div className="glass-panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[18px] font-medium text-[var(--accent-primary)]">REGION DOSSIER</h2>
              <button onClick={() => { setRegionDossier(null); setDossierLoading(false); }} className="text-[14px] font-normal text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">✕</button>
            </div>
            {dossierLoading ? (
              <div className="text-center py-8">
                <div className="w-5 h-5 border-2 border-[var(--cyan-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-[12px] font-mono text-[var(--text-muted)] tracking-widest">LOADING...</span>
              </div>
            ) : regionDossier && (
              <div className="space-y-3">
                <div><div className="hud-label mb-0.5">LOCATION</div><div className="text-[14px] font-normal text-[var(--text-primary)]">{regionDossier.location?.display_name}</div></div>
                {regionDossier.country && (
                  <div className="grid grid-cols-2 gap-2">
                    <div><div className="hud-label mb-0.5">COUNTRY</div><div className="text-[14px] font-normal text-[var(--text-primary)]">{regionDossier.country.flag} {regionDossier.country.name}</div></div>
                    <div><div className="hud-label mb-0.5">CAPITAL</div><div className="text-[14px] font-normal text-[var(--text-primary)]">{regionDossier.country.capital}</div></div>
                    <div><div className="hud-label mb-0.5">POPULATION</div><div className="text-[14px] font-normal text-[var(--text-primary)]">{regionDossier.country.population?.toLocaleString()}</div></div>
                    <div><div className="hud-label mb-0.5">REGION</div><div className="text-[14px] font-normal text-[var(--text-primary)]">{regionDossier.country.subregion || regionDossier.country.region}</div></div>
                    <div><div className="hud-label mb-0.5">LANGUAGES</div><div className="text-[14px] font-normal text-[var(--text-primary)]">{regionDossier.country.languages?.join(', ')}</div></div>
                    <div><div className="hud-label mb-0.5">AREA</div><div className="text-[14px] font-normal text-[var(--text-primary)]">{regionDossier.country.area?.toLocaleString()} km²</div></div>
                  </div>
                )}
                {regionDossier.head_of_state && (<div><div className="hud-label mb-0.5">HEAD OF STATE</div><div className="text-[12px] text-[var(--cyan-primary)]">{regionDossier.head_of_state.name}</div><div className="text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">{regionDossier.head_of_state.position}</div></div>)}
                {regionDossier.wikipedia && (<div><div className="hud-label mb-1">BRIEF</div><div className="flex gap-3">{regionDossier.wikipedia.thumbnail && <img src={regionDossier.wikipedia.thumbnail} alt="" className="w-14 h-14 rounded object-cover flex-shrink-0" />}<p className="text-[14px] font-normal text-[var(--text-secondary)] leading-relaxed">{regionDossier.wikipedia.extract}</p></div></div>)}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── OVERLAYS ── */}
      <div className="vignette absolute inset-0 pointer-events-none z-[2]" />
      <div className="crt-scanlines absolute inset-0 pointer-events-none z-[3] opacity-[0.02]" />
      {['top-0 left-0','top-0 right-0','bottom-0 left-0','bottom-0 right-0'].map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-16 h-16 pointer-events-none z-[1]`}>
          <div className={`absolute ${pos.includes('top') ? 'top-0' : 'bottom-0'} ${pos.includes('left') ? 'left-0' : 'right-0'} w-full h-[1px] bg-gradient-to-${pos.includes('left') ? 'r' : 'l'} from-[var(--cyan-primary)]/30 to-transparent`} />
          <div className={`absolute ${pos.includes('top') ? 'top-0' : 'bottom-0'} ${pos.includes('left') ? 'left-0' : 'right-0'} w-[1px] h-full bg-gradient-to-${pos.includes('top') ? 'b' : 't'} from-[var(--cyan-primary)]/30 to-transparent`} />
        </div>
      ))}

      <KeyboardShortcuts />
      <GlobalStatusBar />

      <div className="desktop-only absolute bottom-12 right-5 z-[200] pointer-events-none text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
        [?] SHORTCUTS · [F] FULLSCREEN · [S] SHARE · [R] RESET VIEW
      </div>

    </main>
  );
}
