'use client';

import { Component, useEffect, useState } from 'react';
import type { ComponentType, ErrorInfo, ReactNode } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, Bell, Shield } from 'lucide-react';
import CommandMap from '@/components/CommandMap';
import { GlassPanel } from '@/components/ui/glass-panel';
import { ALL_LAYERS } from '@/data/layerMap';
import { MASTER_SITES, SITE_BY_ID, type SevLevel, type SiteRecord, type StatusLevel } from '@/data/sites';
import type { ViewId, WallFilters, WallSlot } from '@/server/wallState';

type WallViewProps = {
  filters: WallFilters;
  slot: WallSlot;
};

type MapBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

type MapBoundaryState = {
  hasError: boolean;
};

class MapErrorBoundary extends Component<MapBoundaryProps, MapBoundaryState> {
  state: MapBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MapBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void error;
    void info;
    // WebGL can be unavailable in headless checks or degraded kiosk sessions.
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

type DomainKey = keyof SiteRecord['domains'];

const STATUS_COLOR: Record<StatusLevel, string> = {
  HEALTHY: 'var(--sc-status-ok)',
  WATCH: 'var(--sc-status-watch)',
  CRITICAL: 'var(--sc-status-critical)',
};

const SEVERITY_COLOR: Record<SevLevel, string> = {
  LOW: 'var(--sc-status-neutral)',
  MEDIUM: 'var(--sc-status-watch)',
  HIGH: 'var(--sc-status-watch)',
  CRITICAL: 'var(--sc-status-critical)',
};

function getScopedSites(filters: WallFilters): SiteRecord[] {
  if (!filters.selectedSiteId) return MASTER_SITES;
  const selected = SITE_BY_ID.get(filters.selectedSiteId);
  return selected ? [selected] : MASTER_SITES;
}

function domainActive(filters: WallFilters, key: string) {
  return filters.activeDomains.length === 0 || filters.activeDomains.includes(key);
}

function formatScope(filters: WallFilters) {
  const site = filters.selectedSiteId ? SITE_BY_ID.get(filters.selectedSiteId) : null;
  return site ? `Viewing: ${site.name}` : 'Enterprise-wide';
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function sumSites(sites: SiteRecord[], select: (site: SiteRecord) => number) {
  return sites.reduce((sum, site) => sum + select(site), 0);
}

function WallChrome({ title, kicker, filters, children }: WallViewProps & {
  title: string;
  kicker: string;
  children: ReactNode;
}) {
  return (
    <section className="absolute inset-0 flex flex-col gap-8 px-12 py-10 text-[var(--sc-text)]">
      <header className="flex items-start justify-between gap-8">
        <div>
          <p className="font-mono text-[24px] uppercase tracking-[0.18em] text-[var(--sc-primary)]">{kicker}</p>
          <h1 className="mt-3 text-[58px] font-semibold leading-none text-[var(--sc-text-strong)]">{title}</h1>
        </div>
        <div className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/35 px-6 py-4 text-right font-mono text-[22px] uppercase tracking-[0.14em] text-[var(--sc-text-muted)]">
          <div>{formatScope(filters)}</div>
          <div className="mt-2 text-[var(--sc-primary)]">{filters.timeRange} · {filters.activeDomains.length} domains</div>
        </div>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
      <div className="pointer-events-none absolute right-8 top-8 font-mono text-[18px] uppercase tracking-[0.18em] text-[var(--sc-text-subtle)]">
        DEMO DATA
      </div>
    </section>
  );
}

function StatCard({ label, value, sublabel, tone = 'primary' }: {
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: 'primary' | 'ok' | 'watch' | 'critical' | 'neutral';
}) {
  const color = tone === 'ok'
    ? 'var(--sc-status-ok)'
    : tone === 'watch'
      ? 'var(--sc-status-watch)'
      : tone === 'critical'
        ? 'var(--sc-status-critical)'
        : tone === 'neutral'
          ? 'var(--sc-status-neutral)'
          : 'var(--sc-primary)';

  return (
    <GlassPanel className="h-full p-7">
      <p className="font-mono text-[22px] uppercase tracking-[0.16em] text-[var(--sc-text-muted)]">{label}</p>
      <p className="mt-4 text-[76px] font-semibold leading-none" style={{ color }}>{value}</p>
      {sublabel && <p className="mt-4 text-[28px] text-[var(--sc-text)]">{sublabel}</p>}
    </GlassPanel>
  );
}

function trendPoints(filters: WallFilters) {
  const sites = getScopedSites(filters);
  const steps = filters.timeRange === '1h' ? 8 : filters.timeRange === '24h' ? 12 : filters.timeRange === '7d' ? 7 : 10;
  return Array.from({ length: steps }, (_, index) => {
    const wave = Math.sin(index * 0.85) * 2;
    const drift = index - steps / 2;
    return {
      label: filters.timeRange === '1h' ? `${index * 8}m` : filters.timeRange === '24h' ? `${index * 2}h` : `T-${steps - index - 1}`,
      posture: avg(sites.map(site => site.postureScore + wave + site.domains.posture_index.trend * drift * 0.2)),
      exposure: avg(sites.map(site => site.domains.exposure.score + wave - drift * 0.25)),
      assets: avg(sites.map(site => (site.domains.it_assets.score + site.domains.ot_assets.score) / 2 + wave)),
      people: avg(sites.map(site => (site.domains.awareness.score + site.domains.sim_campaigns.score) / 2 - wave)),
    };
  });
}

export function MapWallView({ filters, slot }: WallViewProps) {
  const selected = filters.selectedSiteId ? SITE_BY_ID.get(filters.selectedSiteId) : null;
  const activeLayers = Object.fromEntries(ALL_LAYERS.map(layer => [layer.key, domainActive(filters, layer.key)]));
  const data = {
    exposure_sites: [],
    assurance_events: [],
    arch_sites: [],
    dlp_sites: [],
    dlp_events: [],
    dlp_chokepoints: [],
    ot_assets: [],
    it_assets: [],
    campaign_events: [],
    news: [],
    access_events: [],
    governance_apps: [],
    retention_sites: [],
  };

  return (
    <section className="absolute inset-0 bg-[var(--sc-bg-0)]">
      <MapErrorBoundary fallback={<MapFallback filters={filters} />}>
        <CommandMap
          data={data}
          activeLayers={activeLayers}
          sitesData={MASTER_SITES}
          selectedSiteId={filters.selectedSiteId}
          flyToLocation={selected ? { lat: selected.lat, lng: selected.lng, zoom: 5.5, ts: Date.now() } : null}
          projection="globe"
          mapStyle="dark"
        />
      </MapErrorBoundary>
      <div className="pointer-events-none absolute left-10 top-10">
        <GlassPanel className="p-7">
          <p className="font-mono text-[24px] uppercase tracking-[0.18em] text-[var(--sc-primary)]">Slot {slot}</p>
          <h1 className="mt-2 text-[54px] font-semibold text-[var(--sc-text-strong)]">Enterprise Map</h1>
          <p className="mt-3 text-[28px] text-[var(--sc-text-muted)]">{formatScope(filters)}</p>
        </GlassPanel>
      </div>
      <div className="pointer-events-none absolute right-8 top-8 font-mono text-[18px] uppercase tracking-[0.18em] text-[var(--sc-text-subtle)]">
        DEMO DATA
      </div>
    </section>
  );
}

function MapFallback({ filters }: { filters: WallFilters }) {
  const sites = getScopedSites(filters);
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_50%,rgba(0,213,232,0.16),transparent_42%),var(--sc-bg-0)]">
      <div className="absolute inset-[8%] rounded-full border border-[var(--sc-border)] opacity-70" />
      <div className="absolute inset-[18%] rounded-full border border-[var(--sc-border)] opacity-50" />
      {sites.map(site => (
        <div
          key={site.id}
          className="absolute rounded-full border-2"
          style={{
            left: `${((site.lng + 180) / 360) * 100}%`,
            top: `${((90 - site.lat) / 180) * 100}%`,
            width: 18,
            height: 18,
            background: STATUS_COLOR[site.domains.posture_index.status],
            borderColor: STATUS_COLOR[site.domains.posture_index.status],
            boxShadow: `0 0 28px ${STATUS_COLOR[site.domains.posture_index.status]}`,
          }}
          title={site.name}
        />
      ))}
      <div className="absolute bottom-10 left-10 rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/50 px-6 py-4 font-mono text-[22px] uppercase tracking-[0.14em] text-[var(--sc-text-muted)]">
        WebGL fallback map
      </div>
    </div>
  );
}

export function AlertsBoard({ filters, slot }: WallViewProps) {
  const scoped = getScopedSites(filters);
  const alerts = scoped.flatMap(site => site.recentActivity.map(activity => ({
    ...activity,
    site: site.name,
    domain: activity.type.toUpperCase(),
  }))).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <WallChrome title="Live Alerts" kicker={`Slot ${slot} · prioritized event queue`} filters={filters} slot={slot}>
      {alerts.length === 0 ? (
        <GlassPanel className="grid h-full place-items-center p-10 text-center">
          <Bell className="mx-auto h-20 w-20 text-[var(--sc-status-ok)]" />
          <p className="mt-8 text-[52px] font-semibold text-[var(--sc-text-strong)]">No alerts in scope</p>
        </GlassPanel>
      ) : (
        <div className="grid h-full grid-rows-[repeat(8,minmax(0,1fr))] gap-4">
          {alerts.slice(0, 8).map((alert, index) => (
            <GlassPanel key={`${alert.site}-${alert.title}-${index}`} className="grid grid-cols-[160px_1fr_190px] items-center gap-6 p-6">
              <div className="font-mono text-[24px] uppercase tracking-[0.14em]" style={{ color: SEVERITY_COLOR[alert.severity] }}>
                {alert.severity}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[34px] font-semibold text-[var(--sc-text-strong)]">{alert.title}</p>
                <p className="mt-1 truncate text-[24px] text-[var(--sc-text-muted)]">{alert.domain} · {alert.site}</p>
              </div>
              <div className="text-right font-mono text-[22px] text-[var(--sc-text-muted)]">
                {new Date(alert.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </WallChrome>
  );
}

export function OTDeepDive({ filters, slot }: WallViewProps) {
  const sites = getScopedSites(filters);
  const total = sumSites(sites, site => site.domains.ot_assets.plcs + site.domains.ot_assets.hmis + site.domains.ot_assets.scada);
  const ranked = [...sites].sort((a, b) => b.domains.ot_assets.plcs - a.domains.ot_assets.plcs).slice(0, 6);

  return (
    <WallChrome title="OT Asset Registry" kicker={`Slot ${slot} · operational technology`} filters={filters} slot={slot}>
      <div className="grid h-full grid-cols-[1fr_1.2fr] gap-7">
        <div className="grid gap-7">
          <StatCard label="Total OT Assets" value={total} sublabel="PLCs, HMIs, and SCADA nodes" tone="ok" />
          <div className="grid grid-cols-3 gap-5">
            <StatCard label="PLCs" value={sumSites(sites, site => site.domains.ot_assets.plcs)} />
            <StatCard label="HMIs" value={sumSites(sites, site => site.domains.ot_assets.hmis)} tone="watch" />
            <StatCard label="SCADA" value={sumSites(sites, site => site.domains.ot_assets.scada)} tone="neutral" />
          </div>
        </div>
        <GlassPanel className="p-7">
          <p className="font-mono text-[24px] uppercase tracking-[0.16em] text-[var(--sc-text-muted)]">Largest OT Footprints</p>
          <div className="mt-7 flex flex-col gap-4">
            {ranked.map(site => (
              <div key={site.id} className="grid grid-cols-[1fr_130px] items-center gap-5 rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 p-5">
                <div>
                  <p className="text-[32px] font-semibold text-[var(--sc-text-strong)]">{site.name}</p>
                  <p className="font-mono text-[20px] uppercase tracking-[0.14em] text-[var(--sc-text-muted)]">{site.region} · {site.domains.ot_assets.status}</p>
                </div>
                <p className="text-right text-[48px] font-semibold" style={{ color: STATUS_COLOR[site.domains.ot_assets.status] }}>
                  {site.domains.ot_assets.score}
                </p>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </WallChrome>
  );
}

export function ITDeepDive({ filters, slot }: WallViewProps) {
  const sites = getScopedSites(filters);
  const total = sumSites(sites, site => site.domains.it_assets.servers + site.domains.it_assets.endpoints + site.domains.it_assets.network + site.domains.it_assets.cloud);
  const ranked = [...sites].sort((a, b) => b.domains.it_assets.endpoints - a.domains.it_assets.endpoints).slice(0, 6);

  return (
    <WallChrome title="IT Asset Registry" kicker={`Slot ${slot} · technology estate`} filters={filters} slot={slot}>
      <div className="grid h-full grid-cols-[1.2fr_1fr] gap-7">
        <GlassPanel className="p-7">
          <p className="font-mono text-[24px] uppercase tracking-[0.16em] text-[var(--sc-text-muted)]">Endpoint Concentration</p>
          <div className="mt-7 flex flex-col gap-4">
            {ranked.map(site => (
              <div key={site.id} className="grid grid-cols-[1fr_170px] items-center gap-5 rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 p-5">
                <div>
                  <p className="text-[32px] font-semibold text-[var(--sc-text-strong)]">{site.name}</p>
                  <p className="font-mono text-[20px] uppercase tracking-[0.14em] text-[var(--sc-text-muted)]">{site.businessUnit}</p>
                </div>
                <p className="text-right text-[48px] font-semibold text-[var(--sc-primary)]">{site.domains.it_assets.endpoints}</p>
              </div>
            ))}
          </div>
        </GlassPanel>
        <div className="grid gap-7">
          <StatCard label="Total IT Assets" value={total} sublabel="Servers, endpoints, network, cloud" />
          <div className="grid grid-cols-2 gap-5">
            <StatCard label="Servers" value={sumSites(sites, site => site.domains.it_assets.servers)} tone="neutral" />
            <StatCard label="Cloud" value={sumSites(sites, site => site.domains.it_assets.cloud)} tone="ok" />
            <StatCard label="Endpoints" value={sumSites(sites, site => site.domains.it_assets.endpoints)} />
            <StatCard label="Network" value={sumSites(sites, site => site.domains.it_assets.network)} tone="watch" />
          </div>
        </div>
      </div>
    </WallChrome>
  );
}

export function PostureTrend({ filters, slot }: WallViewProps) {
  const sites = getScopedSites(filters);
  const points = trendPoints(filters);
  const current = avg(sites.map(site => site.postureScore));
  const prior = points.at(-2)?.posture ?? current;
  const delta = current - prior;

  return (
    <WallChrome title="Posture Trend" kicker={`Slot ${slot} · security index movement`} filters={filters} slot={slot}>
      <div className="grid h-full grid-cols-[420px_1fr] gap-7">
        <GlassPanel className="flex flex-col justify-between p-8">
          <div>
            <p className="font-mono text-[24px] uppercase tracking-[0.16em] text-[var(--sc-text-muted)]">Current Index</p>
            <p className="mt-5 text-[120px] font-semibold leading-none text-[var(--sc-primary)]">{current}</p>
            <p className="mt-6 text-[34px]" style={{ color: delta >= 0 ? 'var(--sc-status-ok)' : 'var(--sc-status-critical)' }}>
              {delta >= 0 ? '+' : ''}{delta} vs prior
            </p>
          </div>
          <div className="grid gap-3 font-mono text-[22px] uppercase tracking-[0.14em] text-[var(--sc-text-muted)]">
            <span>Posture</span>
            <span>Exposure</span>
            <span>Assets</span>
            <span>People</span>
          </div>
        </GlassPanel>
        <GlassPanel className="p-8">
          <div className="h-full min-h-[620px] w-full overflow-hidden">
            <LineChart width={1080} height={640} data={points} margin={{ left: 20, right: 40, top: 20, bottom: 20 }}>
              <CartesianGrid stroke="rgba(218,240,244,0.12)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--sc-text-muted)" tick={{ fontSize: 20 }} />
              <YAxis stroke="var(--sc-text-muted)" domain={[40, 100]} tick={{ fontSize: 20 }} />
              <RechartsTooltip contentStyle={{ background: '#081016', border: '1px solid var(--sc-border)', fontSize: 18 }} />
              <Line type="monotone" dataKey="posture" stroke="var(--sc-primary)" strokeWidth={5} dot={false} />
              <Line type="monotone" dataKey="exposure" stroke="var(--sc-status-critical)" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="assets" stroke="var(--sc-status-ok)" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="people" stroke="var(--sc-status-watch)" strokeWidth={3} dot={false} />
            </LineChart>
          </div>
        </GlassPanel>
      </div>
    </WallChrome>
  );
}

export function ActivityFeed({ filters, slot }: WallViewProps) {
  const scoped = getScopedSites(filters);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(value => value + 1), 4500);
    return () => clearInterval(id);
  }, []);
  const events = scoped.flatMap(site => site.recentActivity.map(activity => ({ ...activity, site: site.name })));
  const visible = Array.from({ length: Math.min(10, events.length) }, (_, index) => events[(index + tick) % events.length]).filter(Boolean);

  return (
    <WallChrome title="Activity Feed" kicker={`Slot ${slot} · live operational timeline`} filters={filters} slot={slot}>
      <GlassPanel className="h-full overflow-hidden p-7">
        <div className="flex flex-col gap-4">
          {visible.map((event, index) => (
            <div key={`${event.site}-${event.title}-${index}-${tick}`} className="grid grid-cols-[150px_90px_1fr] items-center gap-5 rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 p-5">
              <p className="font-mono text-[22px] text-[var(--sc-text-muted)]">{new Date(event.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--sc-hover)] text-[var(--sc-primary)]">
                <Activity className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[32px] font-semibold text-[var(--sc-text-strong)]">{event.title}</p>
                <p className="mt-1 truncate font-mono text-[20px] uppercase tracking-[0.14em]" style={{ color: SEVERITY_COLOR[event.severity] }}>
                  {event.type} · {event.site} · {event.severity}
                </p>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </WallChrome>
  );
}

export function KpiGrid({ filters, slot }: WallViewProps) {
  const sites = getScopedSites(filters);
  const cards = ALL_LAYERS.map(layer => {
    const key = layer.key as DomainKey;
    const value = key in sites[0].domains
      ? avg(sites.map(site => site.domains[key].score))
      : 100;
    const status = value >= 80 ? 'HEALTHY' : value >= 65 ? 'WATCH' : 'CRITICAL';
    return { layer, value, status: status as StatusLevel };
  });

  return (
    <WallChrome title="Domain KPI Grid" kicker={`Slot ${slot} · twelve-domain overview`} filters={filters} slot={slot}>
      <div className="grid h-full grid-cols-4 grid-rows-3 gap-5">
        {cards.map(({ layer, value, status }) => (
          <GlassPanel key={layer.key} className="flex flex-col justify-between p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[18px] uppercase tracking-[0.16em] text-[var(--sc-text-muted)]">{layer.group}</p>
                <h2 className="mt-2 text-[30px] font-semibold leading-tight text-[var(--sc-text-strong)]">{layer.label}</h2>
              </div>
              <layer.Icon className="h-9 w-9 text-[var(--sc-primary)]" />
            </div>
            <div className="flex items-end justify-between">
              <p className="text-[82px] font-semibold leading-none" style={{ color: STATUS_COLOR[status] }}>{value}</p>
              <p className="font-mono text-[20px] uppercase tracking-[0.14em]" style={{ color: STATUS_COLOR[status] }}>{status}</p>
            </div>
          </GlassPanel>
        ))}
      </div>
    </WallChrome>
  );
}

export function AwarenessBoard({ filters, slot }: WallViewProps) {
  const sites = getScopedSites(filters);
  const trained = sumSites(sites, site => site.domains.awareness.trained);
  const total = sumSites(sites, site => site.domains.awareness.total);
  const completion = total ? Math.round((trained / total) * 100) : 0;
  const campaigns = sumSites(sites, site => site.domains.sim_campaigns.sent);
  const clicked = sumSites(sites, site => site.domains.sim_campaigns.clicked);
  const clickRate = campaigns ? Math.round((clicked / campaigns) * 100) : 0;
  const byUnit = Array.from(new Map(sites.map(site => [site.businessUnit, sites.filter(item => item.businessUnit === site.businessUnit)]))).map(([unit, unitSites]) => ({
    unit,
    score: avg(unitSites.map(site => site.domains.awareness.completion_pct)),
  })).slice(0, 7);
  const chartData = byUnit.map(item => ({ name: item.unit, score: item.score }));

  return (
    <WallChrome title="Awareness Board" kicker={`Slot ${slot} · people and campaigns`} filters={filters} slot={slot}>
      <div className="grid h-full grid-cols-[430px_1fr] gap-7">
        <div className="grid gap-7">
          <StatCard label="Completion" value={`${completion}%`} sublabel={`${trained} of ${total} trained`} tone={completion >= 85 ? 'ok' : 'watch'} />
          <StatCard label="Sim Click Rate" value={`${clickRate}%`} sublabel={`${clicked} clicks from ${campaigns} sends`} tone={clickRate <= 5 ? 'ok' : clickRate <= 10 ? 'watch' : 'critical'} />
        </div>
        <GlassPanel className="p-8">
          <p className="font-mono text-[24px] uppercase tracking-[0.16em] text-[var(--sc-text-muted)]">Business Unit Completion</p>
          <div className="mt-8 h-[78%] min-h-[520px] w-full overflow-hidden">
            <AreaChart width={1080} height={560} data={chartData} margin={{ left: 20, right: 30, top: 20, bottom: 20 }}>
              <CartesianGrid stroke="rgba(218,240,244,0.12)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--sc-text-muted)" tick={{ fontSize: 18 }} />
              <YAxis stroke="var(--sc-text-muted)" domain={[50, 100]} tick={{ fontSize: 18 }} />
              <Area type="monotone" dataKey="score" stroke="var(--sc-primary)" fill="rgba(0,213,232,0.18)" strokeWidth={4} />
            </AreaChart>
          </div>
        </GlassPanel>
      </div>
    </WallChrome>
  );
}

export function BlankWallView({ filters, slot }: WallViewProps) {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="absolute inset-0 grid place-items-center bg-[var(--sc-bg-0)] text-center text-[var(--sc-text)]">
      <div>
        <Shield className="mx-auto h-28 w-28 text-[var(--sc-primary)]" strokeWidth={1.4} />
        <h1 className="mt-8 text-[72px] font-semibold text-[var(--sc-text-strong)]">Sentinel</h1>
        <p className="mt-5 font-mono text-[44px] tracking-[0.12em] text-[var(--sc-text-muted)]">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="mt-5 font-mono text-[22px] uppercase tracking-[0.18em] text-[var(--sc-text-subtle)]">
          Slot {slot} · {formatScope(filters)} · DEMO DATA
        </p>
      </div>
    </section>
  );
}

export const WALL_VIEW_COMPONENTS: Record<ViewId, ComponentType<WallViewProps>> = {
  map: MapWallView,
  alerts: AlertsBoard,
  'ot-deep-dive': OTDeepDive,
  'it-deep-dive': ITDeepDive,
  'posture-trend': PostureTrend,
  'activity-feed': ActivityFeed,
  'kpi-grid': KpiGrid,
  'awareness-board': AwarenessBoard,
  blank: BlankWallView,
};
