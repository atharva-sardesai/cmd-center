'use client';

import { Component, useEffect, useState } from 'react';
import type { ComponentType, ErrorInfo, ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, Bell, Cpu, MapPin, Server, Shield, TrendingUp, Users } from 'lucide-react';
import CommandMap from '@/components/CommandMap';
import SiteDetailPanel from '@/components/SiteDetailPanel';
import { GlassPanel } from '@/components/ui/glass-panel';
import { ALL_LAYERS } from '@/data/layerMap';
import { MASTER_SITES, SITE_BY_ID, type SevLevel, type SiteRecord, type StatusLevel } from '@/data/sites';
import { formatClockTime } from '@/lib/format';
import type { ViewId, WallFilters, WallSlot } from '@/server/wallState';

type WallViewProps = {
  filters: WallFilters;
  slot: WallSlot;
  mode?: 'display' | 'control';
  onDraftSiteSelect?: (site: SiteRecord) => void;
  onDraftSiteClear?: () => void;
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

const STATUS_RANK: Record<StatusLevel, number> = {
  HEALTHY: 0,
  WATCH: 1,
  CRITICAL: 2,
};

type WallTone = 'primary' | 'ok' | 'watch' | 'critical' | 'neutral';

type WallAlertRow = {
  id: string;
  time: string;
  severity: SevLevel;
  site: string;
  domain: string;
  title: string;
};

type WallRankRow = {
  id: string;
  title: string;
  meta: string;
  value: string | number;
  status: StatusLevel;
};

function toneColor(tone: WallTone) {
  return tone === 'ok'
    ? 'var(--sc-status-ok)'
    : tone === 'watch'
      ? 'var(--sc-status-watch)'
      : tone === 'critical'
        ? 'var(--sc-status-critical)'
        : tone === 'neutral'
          ? 'var(--sc-status-neutral)'
          : 'var(--sc-primary)';
}

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

function getStatusCounts(sites: SiteRecord[]) {
  return sites.reduce((counts, site) => {
    counts[site.domains.posture_index.status] += 1;
    return counts;
  }, { HEALTHY: 0, WATCH: 0, CRITICAL: 0 } as Record<StatusLevel, number>);
}

function getOpenCriticals(sites: SiteRecord[]) {
  return sumSites(sites, site => site.domains.exposure.criticals + site.domains.access_recert.overdue);
}

function getRecentEvents(sites: SiteRecord[]) {
  return sites
    .flatMap(site => site.recentActivity.map(activity => ({ ...activity, site: site.name })))
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}

function WallViewFrame({ title, kicker, filters, slot, hero, children }: {
  title: string;
  kicker: string;
  filters: WallFilters;
  slot: WallSlot;
  hero: ReactNode;
  children: ReactNode;
}) {
  const domainCount = filters.activeDomains.length || ALL_LAYERS.length;

  return (
    <section className="absolute inset-0 grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-5 overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.08),transparent_34%),var(--sc-bg-0)] px-6 py-5 text-[var(--sc-text)] styled-scrollbar">
      <header className="grid min-h-[76px] grid-cols-[minmax(0,1fr)_auto] items-start gap-6 border-b border-[var(--sc-border)] pb-4 max-md:grid-cols-1">
        <div className="min-w-0">
          <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-[var(--sc-primary)]">Slot {slot} · {kicker}</p>
          <h1 className="mt-2 truncate text-[28px] font-semibold leading-none text-[var(--sc-text-strong)]">{title}</h1>
        </div>
        <div className="min-w-[260px] rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/35 px-4 py-3 text-right">
          <p className="truncate text-[16px] font-semibold text-[var(--sc-text-strong)]">{formatScope(filters)}</p>
          <p className="mt-1 font-mono text-[12px] uppercase tracking-[0.12em] text-[var(--sc-text-muted)]">
            {filters.timeRange} · {domainCount} domains active
          </p>
        </div>
      </header>

      <div>{hero}</div>
      <div className="min-h-[360px] overflow-hidden">{children}</div>
    </section>
  );
}

function WallHeroStat({ label, value, detail, trend, tone = 'primary', icon }: {
  label: string;
  value: string | number;
  detail: string;
  trend?: string;
  tone?: WallTone;
  icon?: ReactNode;
}) {
  const color = toneColor(tone);

  return (
    <GlassPanel className="min-h-[150px] p-5">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center gap-3">
          {icon && (
            <span className="grid h-8 w-8 place-items-center rounded-[var(--sc-radius)] bg-[var(--sc-hover)] text-[var(--sc-primary)]">
              {icon}
            </span>
          )}
          <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-[var(--sc-text-muted)]">{label}</p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <p className="font-mono text-[56px] font-semibold leading-none" style={{ color: tone === 'primary' ? 'var(--sc-text-strong)' : color }}>{value}</p>
          {trend && (
            <p className="mb-1 inline-flex items-center gap-2 rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/25 px-3 py-2 font-mono text-[13px] uppercase tracking-[0.1em] text-[var(--sc-text-muted)]">
              <TrendingUp className="h-3.5 w-3.5 text-[var(--sc-primary)]" />
              {trend}
            </p>
          )}
        </div>
        <p className="text-[15px] leading-snug text-[var(--sc-text-muted)]">{detail}</p>
      </div>
    </GlassPanel>
  );
}

function WallKpiCard({ label, value, detail, tone = 'primary' }: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: WallTone;
}) {
  const color = toneColor(tone);

  return (
    <GlassPanel className="flex min-h-[148px] flex-col p-4">
      <p className="font-mono text-[13px] leading-relaxed uppercase tracking-[0.12em] text-[var(--sc-text-muted)]">{label}</p>
      <div className="min-w-0 pt-4">
        <p className="font-mono text-[30px] font-semibold leading-none" style={{ color: tone === 'primary' ? 'var(--sc-text-strong)' : color }}>{value}</p>
        {detail && <p className="mt-2 text-[15px] leading-snug text-[var(--sc-text-muted)]">{detail}</p>}
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/5">
          <div className="h-full w-2/3 rounded-full" style={{ background: tone === 'primary' ? 'var(--sc-primary)' : color }} />
        </div>
      </div>
    </GlassPanel>
  );
}

function WallStatusPill({ status }: { status: StatusLevel }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/25 px-2.5 py-1 font-mono text-[12px] uppercase tracking-[0.1em]"
      style={{ color: STATUS_COLOR[status] }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[status] }} />
      {status}
    </span>
  );
}

function WallSectionHeading({ label, detail }: { label: string; detail?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="font-mono text-[14px] uppercase tracking-[0.12em] text-[var(--sc-primary)]">{label}</p>
        {detail && <p className="mt-1 text-[15px] text-[var(--sc-text-muted)]">{detail}</p>}
      </div>
    </div>
  );
}

function RankedListRow({ rank, title, meta, value, status }: {
  rank: number;
  title: string;
  meta: string;
  value: string | number;
  status: StatusLevel;
}) {
  return (
    <div className="grid min-h-[92px] grid-cols-[46px_minmax(0,1fr)_auto_100px] items-center gap-4 rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 px-4 py-3 max-md:grid-cols-[40px_minmax(0,1fr)]">
      <span className="font-mono text-[14px] text-[var(--sc-text-subtle)]">#{rank}</span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-[17px] font-semibold leading-snug text-[var(--sc-text-strong)]">{title}</p>
        <p className="mt-1 truncate font-mono text-[12px] uppercase tracking-[0.1em] text-[var(--sc-text-muted)]">{meta}</p>
      </div>
      <div className="justify-self-start max-md:col-start-2 max-md:row-start-2">
        <WallStatusPill status={status} />
      </div>
      <p className="text-right font-mono text-[26px] font-semibold leading-none text-[var(--sc-text-strong)] max-md:col-start-2 max-md:row-start-3 max-md:text-left">{value}</p>
    </div>
  );
}

function DonutChart({ data }: {
  data: Array<{ label: string; value: number; color: string }>;
}) {
  return (
    <div className="h-full min-h-[210px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="54%"
            outerRadius="78%"
            paddingAngle={3}
            stroke="rgba(5,7,10,0.8)"
            strokeWidth={2}
          >
            {data.map(item => <Cell key={item.label} fill={item.color} />)}
          </Pie>
          <RechartsTooltip contentStyle={{ background: '#081016', border: '1px solid var(--sc-border)', borderRadius: 8, fontSize: 14 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartLegend({ data }: {
  data: Array<{ label: string; value: number; color: string }>;
}) {
  return (
    <div className="grid gap-3">
      {data.map(item => (
        <div key={item.label} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 px-3 py-2">
          <span className="flex items-center gap-2 text-[15px] font-semibold text-[var(--sc-text-strong)]">
            <span className="h-3 w-3 rounded-full" style={{ background: item.color }} />
            {item.label}
          </span>
          <span className="font-mono text-[18px] font-semibold text-[var(--sc-text-strong)]">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function statusFromScore(score: number): StatusLevel {
  return score >= 80 ? 'HEALTHY' : score >= 65 ? 'WATCH' : 'CRITICAL';
}

function toneFromScore(score: number): WallTone {
  return score >= 80 ? 'ok' : score >= 65 ? 'watch' : 'critical';
}

function signedValue(value: number) {
  return `${value >= 0 ? '+' : ''}${value}`;
}

function domainCards(sites: SiteRecord[]) {
  return ALL_LAYERS.filter(layer => layer.key !== 'day_night').map(layer => {
    const key = layer.key as DomainKey;
    const value = avg(sites.map(site => site.domains[key].score));
    return {
      layer,
      value,
      status: statusFromScore(value),
      trend: avg(sites.map(site => site.domains[key].trend)),
    };
  });
}

function offsetTime(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() - minutes * 60_000).toISOString();
}

function buildWallAlerts(sites: SiteRecord[], count: number): WallAlertRow[] {
  const domainTemplates = [
    {
      domain: 'EXPOSURE',
      title: (site: SiteRecord) => `${site.domains.exposure.criticals} critical exposure findings pending triage`,
      severity: (site: SiteRecord): SevLevel => site.domains.exposure.severity,
      score: (site: SiteRecord) => 100 - site.domains.exposure.score,
    },
    {
      domain: 'APP ASSURANCE',
      title: (site: SiteRecord) => `${site.domains.app_assurance.openTests} security tests need closure`,
      severity: (site: SiteRecord): SevLevel => site.domains.app_assurance.status === 'CRITICAL' ? 'CRITICAL' : site.domains.app_assurance.status === 'WATCH' ? 'HIGH' : 'MEDIUM',
      score: (site: SiteRecord) => site.domains.app_assurance.findings,
    },
    {
      domain: 'ACCESS',
      title: (site: SiteRecord) => `${site.domains.access_recert.overdue} access reviews are overdue`,
      severity: (site: SiteRecord): SevLevel => site.domains.access_recert.status === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      score: (site: SiteRecord) => site.domains.access_recert.overdue,
    },
    {
      domain: 'DLP',
      title: (site: SiteRecord) => `${site.domains.dlp.incidents} DLP incidents require validation`,
      severity: (site: SiteRecord): SevLevel => site.domains.dlp.status === 'HEALTHY' ? 'MEDIUM' : 'HIGH',
      score: (site: SiteRecord) => site.domains.dlp.incidents,
    },
    {
      domain: 'OT ASSETS',
      title: (site: SiteRecord) => `${site.domains.ot_assets.plcs} PLCs mapped for coverage review`,
      severity: (site: SiteRecord): SevLevel => site.domains.ot_assets.status === 'CRITICAL' ? 'CRITICAL' : site.domains.ot_assets.status === 'WATCH' ? 'HIGH' : 'MEDIUM',
      score: (site: SiteRecord) => 100 - site.domains.ot_assets.score,
    },
    {
      domain: 'AWARENESS',
      title: (site: SiteRecord) => `${site.domains.awareness.completion_pct}% awareness completion in scope`,
      severity: (site: SiteRecord): SevLevel => site.domains.awareness.status === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
      score: (site: SiteRecord) => 100 - site.domains.awareness.score,
    },
    {
      domain: 'ARCH REVIEW',
      title: (site: SiteRecord) => `${site.domains.arch_reviews.scheduled} architecture reviews scheduled`,
      severity: (site: SiteRecord): SevLevel => site.domains.arch_reviews.status === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
      score: (site: SiteRecord) => 100 - site.domains.arch_reviews.score,
    },
    {
      domain: 'SIM CAMPAIGN',
      title: (site: SiteRecord) => `${site.domains.sim_campaigns.click_rate}% simulated-campaign click rate observed`,
      severity: (site: SiteRecord): SevLevel => site.domains.sim_campaigns.click_rate > 10 ? 'HIGH' : site.domains.sim_campaigns.click_rate > 5 ? 'MEDIUM' : 'LOW',
      score: (site: SiteRecord) => site.domains.sim_campaigns.click_rate,
    },
    {
      domain: 'GOVERNANCE',
      title: (site: SiteRecord) => `${site.domains.app_governance.review_due} application governance reviews due`,
      severity: (site: SiteRecord): SevLevel => site.domains.app_governance.status === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM',
      score: (site: SiteRecord) => site.domains.app_governance.review_due,
    },
    {
      domain: 'RETENTION',
      title: (site: SiteRecord) => `${site.domains.activity_retention.coverage_pct}% activity-retention coverage reported`,
      severity: (site: SiteRecord): SevLevel => site.domains.activity_retention.status === 'CRITICAL' ? 'HIGH' : 'LOW',
      score: (site: SiteRecord) => 100 - site.domains.activity_retention.coverage_pct,
    },
  ];

  const rows = sites.flatMap(site => domainTemplates.map((template, index) => ({
    id: `${site.id}-${template.domain}-${index}`,
    time: offsetTime(site.recentActivity[index % site.recentActivity.length]?.time ?? new Date().toISOString(), index * 17),
    severity: template.severity(site),
    site: site.name,
    domain: template.domain,
    title: template.title(site),
    sort: STATUS_RANK[site.domains.posture_index.status] * 1000 + template.score(site),
  })));

  return rows
    .sort((a, b) => b.sort - a.sort || new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, count)
    .map(row => ({
      id: row.id,
      time: row.time,
      severity: row.severity,
      site: row.site,
      domain: row.domain,
      title: row.title,
    }));
}

function buildWallEvents(sites: SiteRecord[], count: number): WallAlertRow[] {
  const activityRows = sites.flatMap(site => site.recentActivity.map((activity, index) => ({
    id: `${site.id}-activity-${index}`,
    time: offsetTime(activity.time, index * 11),
    severity: activity.severity,
    site: site.name,
    domain: activity.type.toUpperCase(),
    title: activity.title,
  })));

  const syntheticRows = buildWallAlerts(sites, count).map((alert, index) => ({
    ...alert,
    id: `${alert.id}-signal`,
    time: offsetTime(alert.time, index * 7),
    title: alert.title.replace('pending triage', 'added to operations queue'),
  }));

  return [...activityRows, ...syntheticRows]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, count);
}

function buildOtRows(sites: SiteRecord[], count: number): WallRankRow[] {
  if (sites.length === 1) {
    const site = sites[0];
    const groups = [
      { label: 'PLC coverage', value: site.domains.ot_assets.plcs, delta: 0 },
      { label: 'HMI inventory', value: site.domains.ot_assets.hmis, delta: 4 },
      { label: 'SCADA nodes', value: site.domains.ot_assets.scada, delta: 8 },
      { label: 'Control zone A', value: Math.max(1, Math.round(site.domains.ot_assets.plcs * 0.42)), delta: 12 },
      { label: 'Control zone B', value: Math.max(1, Math.round(site.domains.ot_assets.hmis * 0.58)), delta: 16 },
      { label: 'Engineering access', value: Math.max(1, Math.round((site.domains.ot_assets.plcs + site.domains.ot_assets.hmis) * 0.18)), delta: 20 },
    ];
    return groups.slice(0, count).map((group, index) => ({
      id: `${site.id}-ot-${group.label}`,
      title: group.label,
      meta: `${site.name} · ${site.region} · ${group.value} assets`,
      value: Math.max(35, site.domains.ot_assets.score - group.delta + index),
      status: statusFromScore(site.domains.ot_assets.score - group.delta),
    }));
  }

  return [...sites]
    .sort((a, b) => {
      const riskDelta = STATUS_RANK[b.domains.ot_assets.status] - STATUS_RANK[a.domains.ot_assets.status];
      if (riskDelta !== 0) return riskDelta;
      return a.domains.ot_assets.score - b.domains.ot_assets.score;
    })
    .slice(0, count)
    .map(site => {
      const assetCount = site.domains.ot_assets.plcs + site.domains.ot_assets.hmis + site.domains.ot_assets.scada;
      return {
        id: site.id,
        title: site.name,
        meta: `${site.region} · ${site.businessUnit} · ${assetCount} assets`,
        value: site.domains.ot_assets.score,
        status: site.domains.ot_assets.status,
      };
    });
}

function buildItRows(sites: SiteRecord[], count: number): WallRankRow[] {
  if (sites.length === 1) {
    const site = sites[0];
    const groups = [
      { label: 'Endpoint fleet', value: site.domains.it_assets.endpoints, status: site.domains.it_assets.status },
      { label: 'Server estate', value: site.domains.it_assets.servers, status: statusFromScore(site.domains.it_assets.score + 4) },
      { label: 'Cloud workloads', value: site.domains.it_assets.cloud, status: statusFromScore(site.domains.it_assets.score + 8) },
      { label: 'Network devices', value: site.domains.it_assets.network, status: statusFromScore(site.domains.it_assets.score - 4) },
      { label: 'Managed endpoints', value: Math.round(site.domains.it_assets.endpoints * 0.74), status: statusFromScore(site.domains.it_assets.score + 2) },
      { label: 'Privileged systems', value: Math.round(site.domains.it_assets.servers * 0.22), status: statusFromScore(site.domains.it_assets.score - 8) },
      { label: 'Remote access nodes', value: Math.round(site.domains.it_assets.network * 0.35), status: statusFromScore(site.domains.it_assets.score - 12) },
    ];
    return groups.slice(0, count).map(group => ({
      id: `${site.id}-it-${group.label}`,
      title: group.label,
      meta: `${site.name} · ${site.businessUnit}`,
      value: group.value,
      status: group.status,
    }));
  }

  return [...sites]
    .sort((a, b) => b.domains.it_assets.endpoints - a.domains.it_assets.endpoints)
    .slice(0, count)
    .map(site => ({
      id: site.id,
      title: site.name,
      meta: `${site.businessUnit} · ${site.domains.it_assets.servers} servers · ${site.domains.it_assets.cloud} cloud`,
      value: site.domains.it_assets.endpoints,
      status: site.domains.it_assets.status,
    }));
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

export function MapWallView({ filters, slot, mode = 'display', onDraftSiteSelect, onDraftSiteClear }: WallViewProps) {
  const selected = filters.selectedSiteId ? SITE_BY_ID.get(filters.selectedSiteId) : null;
  const scopedSites = getScopedSites(filters);
  const statusCounts = getStatusCounts(scopedSites);
  const criticals = getOpenCriticals(scopedSites);
  const posture = avg(scopedSites.map(site => site.postureScore));
  const rankedSites = [...scopedSites]
    .sort((a, b) => a.postureScore - b.postureScore)
    .slice(0, 7);
  const recentEvents = getRecentEvents(scopedSites).slice(0, 6);
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
          markerScale={0.62}
          markerOpacity={0.55}
          interactive={mode === 'control'}
          onSiteClick={mode === 'control' ? onDraftSiteSelect : undefined}
        />
      </MapErrorBoundary>
      <div className={`pointer-events-none absolute left-5 right-5 top-5 z-20 grid gap-4 ${selected ? 'grid-cols-[320px_1fr]' : 'grid-cols-[320px_1fr_320px]'}`}>
        <GlassPanel className="pointer-events-auto max-h-[calc(100vh-40px)] overflow-hidden p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-[var(--sc-primary)]">Slot {slot}</p>
              <h1 className="mt-2 text-[26px] font-semibold leading-none text-[var(--sc-text-strong)]">Command Map</h1>
              <p className="mt-2 text-[14px] font-semibold text-[var(--sc-text-strong)]">{formatScope(filters)}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--sc-text-muted)]">
                {filters.timeRange} · {(filters.activeDomains.length || ALL_LAYERS.length)} domains active
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--sc-text-subtle)]">DEMO DATA</p>
            </div>
            <MapPin className="h-6 w-6 text-[var(--sc-primary)]" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <MiniMetric label="Sites" value={scopedSites.length} />
            <MiniMetric label="Posture" value={posture} tone={posture >= 80 ? 'ok' : posture >= 65 ? 'watch' : 'critical'} />
            <MiniMetric label="Critical" value={statusCounts.CRITICAL} tone="critical" />
            <MiniMetric label="Open Risk" value={criticals} tone={criticals > 40 ? 'critical' : 'watch'} />
          </div>
          <div className="mt-4 rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/25 p-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--sc-text-muted)]">Marker Legend</p>
            <div className="mt-3 grid gap-2 text-[12px]">
              <LegendItem color="var(--sc-status-ok)" label={`Healthy · ${statusCounts.HEALTHY}`} />
              <LegendItem color="var(--sc-status-watch)" label={`Watch · ${statusCounts.WATCH}`} />
              <LegendItem color="var(--sc-status-critical)" label={`Critical · ${statusCounts.CRITICAL}`} />
            </div>
          </div>
        </GlassPanel>

        <div className="pointer-events-none" />

        {!selected && (
          <GlassPanel className="pointer-events-auto max-h-[calc(100vh-40px)] overflow-hidden p-4">
              <div className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/25 p-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--sc-primary)]">Live Activity</p>
                <div className="mt-2 flex flex-col gap-2">
                  {recentEvents.slice(0, 4).map(event => (
                    <div key={`${event.site}-${event.title}-${event.time}`} className="grid grid-cols-[44px_1fr] gap-2 text-[12px]">
                      <span className="font-mono text-[var(--sc-text-muted)]">{formatClockTime(event.time)}</span>
                      <span className="truncate text-[var(--sc-text)]">{event.site}: {event.title}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--sc-primary)]">Lowest Posture Sites</p>
              <div className="mt-3 max-h-[42vh] overflow-auto pr-1">
                <div className="flex flex-col gap-2">
                  {rankedSites.map(site => (
                    <div key={site.id} className="grid grid-cols-[1fr_54px] items-center gap-2 rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/25 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-[var(--sc-text-strong)]">{site.name}</p>
                        <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--sc-text-muted)]">
                          {site.region} · {site.domains.exposure.criticals} criticals · {site.domains.ot_assets.plcs} PLCs
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[site.domains.posture_index.status] }} />
                        <span className="font-mono text-[18px] font-semibold" style={{ color: STATUS_COLOR[site.domains.posture_index.status] }}>{site.postureScore}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          </GlassPanel>
        )}
      </div>
      {selected && (
        <div className="pointer-events-auto absolute bottom-5 right-5 top-5 z-40 w-80">
          <SiteDetailPanel
            site={selected}
            onClose={mode === 'control' ? (onDraftSiteClear ?? (() => undefined)) : (() => undefined)}
          />
        </div>
      )}
      <div className={`pointer-events-none absolute bottom-5 left-[345px] z-20 grid grid-cols-4 gap-3 ${selected ? 'right-[365px]' : 'right-[345px]'}`}>
        <MiniMetric label="Healthy" value={statusCounts.HEALTHY} tone="ok" />
        <MiniMetric label="Watch" value={statusCounts.WATCH} tone="watch" />
        <MiniMetric label="Critical" value={statusCounts.CRITICAL} tone="critical" />
        <MiniMetric label="Time Range" value={filters.timeRange} />
      </div>
    </section>
  );
}

function MiniMetric({ label, value, tone = 'primary' }: {
  label: string;
  value: string | number;
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
    <div className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/45 px-3 py-2 backdrop-blur-sm">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--sc-text-muted)]">{label}</p>
      <p className="mt-1 text-[22px] font-semibold leading-none" style={{ color }}>{value}</p>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-[var(--sc-text)]">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="h-px flex-1 bg-[var(--sc-border)]" />
    </div>
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
      <div className="absolute bottom-10 left-10 rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/50 px-6 py-4 font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--sc-text-muted)]">
        WebGL fallback map
      </div>
    </div>
  );
}

export function AlertsBoard({ filters, slot }: WallViewProps) {
  const scoped = getScopedSites(filters);
  const alerts = buildWallAlerts(scoped, 12);
  const critical = alerts.filter(alert => alert.severity === 'CRITICAL').length;
  const high = alerts.filter(alert => alert.severity === 'HIGH').length;
  const active = alerts.length;
  const bySeverity = (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as SevLevel[]).map(severity => ({
    label: severity,
    value: alerts.filter(alert => alert.severity === severity).length,
    color: SEVERITY_COLOR[severity],
  }));
  const byDomain = Array.from(new Map(alerts.map(alert => [alert.domain, alerts.filter(item => item.domain === alert.domain).length])))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <WallViewFrame
      title="Live Alerts"
      kicker="Prioritized event queue"
      filters={filters}
      slot={slot}
      hero={(
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <WallHeroStat
            label="Active alerts"
            value={active}
            detail="Recent security activity in the current wall scope, prioritized by severity and recency."
            trend={`${critical} critical · ${high} high`}
            tone="primary"
            icon={<Bell className="h-8 w-8" />}
          />
          <WallKpiCard label="Critical" value={critical} detail="Requires attention" tone={critical > 0 ? 'critical' : 'neutral'} />
          <WallKpiCard label="High" value={high} detail="Elevated severity" tone={high > 0 ? 'watch' : 'neutral'} />
        </div>
      )}
    >
      {alerts.length === 0 ? (
        <GlassPanel className="grid h-full place-items-center p-10 text-center">
          <Bell className="mx-auto h-20 w-20 text-[var(--sc-status-ok)]" />
          <p className="mt-8 text-[34px] font-semibold text-[var(--sc-text-strong)]">No alerts in scope</p>
          <p className="mt-3 text-[15px] text-[var(--sc-text-muted)]">The selected enterprise or site scope has no recent alert rows.</p>
        </GlassPanel>
      ) : (
        <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_280px] gap-5 pb-2 max-lg:grid-cols-1">
          <GlassPanel className="flex min-h-0 flex-col p-5">
            <div className="grid grid-cols-[136px_1fr_170px_110px] border-b border-[var(--sc-border)] pb-3 font-mono text-[13px] uppercase tracking-[0.1em] text-[var(--sc-text-muted)] max-lg:hidden">
              <span>Severity</span>
              <span>Description</span>
              <span>Site</span>
              <span className="text-right">Time</span>
            </div>
            <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 styled-scrollbar">
              {alerts.slice(0, 10).map(alert => (
                <div key={alert.id} className="grid min-h-[92px] grid-cols-[136px_minmax(0,1fr)_170px_110px] items-center gap-4 rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 px-4 py-3 max-lg:grid-cols-[126px_minmax(0,1fr)]">
                  <div className="flex items-center gap-2 font-mono text-[13px] uppercase tracking-[0.1em]" style={{ color: SEVERITY_COLOR[alert.severity] }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: SEVERITY_COLOR[alert.severity] }} />
                    {alert.severity}
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="truncate text-[18px] font-semibold leading-snug text-[var(--sc-text-strong)]">{alert.title}</p>
                    <p className="truncate font-mono text-[12px] uppercase tracking-[0.1em] text-[var(--sc-text-muted)]">
                      {alert.domain} · {alert.site} · {formatClockTime(alert.time)}
                    </p>
                  </div>
                  <p className="truncate text-[16px] text-[var(--sc-text-muted)] max-lg:hidden">{alert.site}</p>
                  <p className="text-right font-mono text-[13px] text-[var(--sc-text-muted)] max-lg:hidden">{formatClockTime(alert.time)}</p>
                </div>
              ))}
            </div>
          </GlassPanel>
          <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-5">
            <GlassPanel className="min-h-0 overflow-hidden p-5">
              <WallSectionHeading label="Severity mix" detail="Current alert queue" />
              <div className="mt-4 grid min-h-[220px] grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] items-center gap-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bySeverity} margin={{ left: -18, right: 4, top: 8, bottom: 0 }}>
                    <XAxis dataKey="label" stroke="var(--sc-text-muted)" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {bySeverity.map(item => <Cell key={item.label} fill={item.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <ChartLegend data={bySeverity} />
              </div>
            </GlassPanel>
            <GlassPanel className="min-h-0 overflow-hidden p-5">
              <WallSectionHeading label="Domain load" detail="Highest-volume alert sources" />
              <div className="mt-5 flex max-h-[calc(100%-58px)] flex-col gap-3 overflow-y-auto pr-1 styled-scrollbar">
                {byDomain.map(([domain, value]) => (
                  <div key={domain} className="grid grid-cols-[1fr_44px] items-center gap-3 rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 px-3 py-2">
                    <p className="truncate font-mono text-[13px] uppercase tracking-[0.1em] text-[var(--sc-text-muted)]">{domain}</p>
                    <p className="text-right font-mono text-[20px] font-semibold text-[var(--sc-text-strong)]">{value}</p>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>
        </div>
      )}
    </WallViewFrame>
  );
}

export function OTDeepDive({ filters, slot }: WallViewProps) {
  const sites = getScopedSites(filters);
  const plcs = sumSites(sites, site => site.domains.ot_assets.plcs);
  const hmis = sumSites(sites, site => site.domains.ot_assets.hmis);
  const scada = sumSites(sites, site => site.domains.ot_assets.scada);
  const total = plcs + hmis + scada;
  const averageScore = avg(sites.map(site => site.domains.ot_assets.score));
  const postureTone: WallTone = averageScore >= 80 ? 'ok' : averageScore >= 65 ? 'watch' : 'critical';
  const watchSites = sites.filter(site => site.domains.ot_assets.status !== 'HEALTHY').length;
  const rankedRows = buildOtRows(sites, 6);
  const recentSignals = buildWallEvents(sites, 5);
  const composition = [
    { label: 'PLCs', value: plcs, color: 'var(--sc-primary)', tone: 'primary' as WallTone },
    { label: 'HMIs', value: hmis, color: 'var(--sc-status-watch)', tone: 'watch' as WallTone },
    { label: 'SCADA', value: scada, color: 'var(--sc-status-neutral)', tone: 'neutral' as WallTone },
  ];

  return (
    <WallViewFrame
      title="OT Asset Registry"
      kicker="Operational technology"
      filters={filters}
      slot={slot}
      hero={(
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <WallHeroStat
            label="Total OT assets"
            value={total}
            detail="PLCs, HMIs, and SCADA nodes currently represented in the selected operating scope."
            trend={`${sites.length} site${sites.length === 1 ? '' : 's'} · ${filters.timeRange}`}
            tone="primary"
            icon={<Cpu className="h-8 w-8" />}
          />
          <WallKpiCard label="OT posture" value={averageScore} detail="Average index" tone={postureTone} />
          <WallKpiCard label="Sites to watch" value={watchSites} detail="Watch or critical" tone={watchSites > 4 ? 'critical' : watchSites > 0 ? 'watch' : 'ok'} />
        </div>
      )}
    >
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] gap-5 pb-2 max-lg:grid-cols-1">
        <div className="grid min-h-0 grid-rows-[auto_1fr] gap-5">
          <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
            <WallKpiCard label="PLCs" value={plcs} detail={`${Math.round((plcs / Math.max(total, 1)) * 100)}% of OT`} />
            <WallKpiCard label="HMIs" value={hmis} detail={`${Math.round((hmis / Math.max(total, 1)) * 100)}% of OT`} />
            <WallKpiCard label="SCADA" value={scada} detail={`${Math.round((scada / Math.max(total, 1)) * 100)}% of OT`} />
          </div>

          <GlassPanel className="min-h-0 overflow-hidden p-5">
            <WallSectionHeading label="Asset mix" detail="Composition across control and supervisory systems" />
            <div className="mt-5 grid min-h-[230px] grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] items-center gap-5 max-md:grid-cols-1">
              <DonutChart data={composition} />
              <ChartLegend data={composition} />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 p-4">
                <p className="font-mono text-[12px] uppercase tracking-[0.1em] text-[var(--sc-text-muted)]">Healthy</p>
                <p className="mt-2 font-mono text-[28px] font-semibold text-[var(--sc-status-ok)]">
                  {sites.filter(site => site.domains.ot_assets.status === 'HEALTHY').length}
                </p>
              </div>
              <div className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 p-4">
                <p className="font-mono text-[12px] uppercase tracking-[0.1em] text-[var(--sc-text-muted)]">Watch</p>
                <p className="mt-2 font-mono text-[28px] font-semibold text-[var(--sc-status-watch)]">
                  {sites.filter(site => site.domains.ot_assets.status === 'WATCH').length}
                </p>
              </div>
              <div className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 p-4">
                <p className="font-mono text-[12px] uppercase tracking-[0.1em] text-[var(--sc-text-muted)]">Critical</p>
                <p className="mt-2 font-mono text-[28px] font-semibold text-[var(--sc-status-critical)]">
                  {sites.filter(site => site.domains.ot_assets.status === 'CRITICAL').length}
                </p>
              </div>
            </div>
          </GlassPanel>
        </div>

        <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,0.9fr)] gap-5">
          <GlassPanel className="flex min-h-0 flex-col p-5">
            <WallSectionHeading label="OT exposure watchlist" detail="Ranked by OT status and lowest posture score" />
            <div className="mt-5 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 styled-scrollbar">
              {rankedRows.map((row, index) => (
                <RankedListRow
                  key={row.id}
                  rank={index + 1}
                  title={row.title}
                  meta={row.meta}
                  value={row.value}
                  status={row.status}
                />
              ))}
            </div>
          </GlassPanel>
          <GlassPanel className="flex min-h-0 flex-col p-5">
            <WallSectionHeading label="Recent OT signals" detail="Asset and control-plane activity" />
            <div className="mt-5 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 styled-scrollbar">
              {recentSignals.map((event, index) => (
                <div key={`${event.site}-${event.title}-${index}`} className="grid min-h-[82px] grid-cols-[78px_minmax(0,1fr)] items-center gap-3 rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 px-3 py-3">
                  <p className="font-mono text-[12px] text-[var(--sc-text-muted)]">{formatClockTime(event.time)}</p>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="truncate text-[15px] font-semibold leading-snug text-[var(--sc-text-strong)]">{event.title}</p>
                    <p className="truncate font-mono text-[12px] uppercase tracking-[0.1em]" style={{ color: SEVERITY_COLOR[event.severity] }}>{event.site} · {event.severity}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>
    </WallViewFrame>
  );
}

export function ITDeepDive({ filters, slot }: WallViewProps) {
  const sites = getScopedSites(filters);
  const servers = sumSites(sites, site => site.domains.it_assets.servers);
  const endpoints = sumSites(sites, site => site.domains.it_assets.endpoints);
  const network = sumSites(sites, site => site.domains.it_assets.network);
  const cloud = sumSites(sites, site => site.domains.it_assets.cloud);
  const total = servers + endpoints + network + cloud;
  const averageScore = avg(sites.map(site => site.domains.it_assets.score));
  const postureTone = toneFromScore(averageScore);
  const rankedRows = buildItRows(sites, 7);
  const composition = [
    { label: 'Endpoints', value: endpoints, color: 'var(--sc-primary)', tone: 'primary' as WallTone },
    { label: 'Servers', value: servers, color: 'var(--sc-status-neutral)', tone: 'neutral' as WallTone },
    { label: 'Network', value: network, color: 'var(--sc-status-watch)', tone: 'watch' as WallTone },
    { label: 'Cloud', value: cloud, color: 'var(--sc-status-ok)', tone: 'ok' as WallTone },
  ];

  return (
    <WallViewFrame
      title="IT Asset Registry"
      kicker="Technology estate"
      filters={filters}
      slot={slot}
      hero={(
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <WallHeroStat
            label="Total IT assets"
            value={total}
            detail="Servers, endpoints, network devices, and cloud workloads in the selected scope."
            trend={`${endpoints} endpoints`}
            tone="primary"
            icon={<Server className="h-8 w-8" />}
          />
          <WallKpiCard label="IT posture" value={averageScore} detail="Average index" tone={postureTone} />
          <WallKpiCard label="Cloud" value={cloud} detail="Tracked workloads" />
        </div>
      )}
    >
      <div className="grid h-full min-h-0 grid-cols-2 gap-5 pb-2 max-lg:grid-cols-1">
        <GlassPanel className="flex min-h-0 flex-col p-5">
          <WallSectionHeading label="Endpoint concentration" detail="Largest endpoint estates in scope" />
          <div className="mt-5 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 styled-scrollbar">
            {rankedRows.map((row, index) => (
              <RankedListRow
                key={row.id}
                rank={index + 1}
                title={row.title}
                meta={row.meta}
                value={row.value}
                status={row.status}
              />
            ))}
          </div>
        </GlassPanel>

        <div className="grid min-h-0 grid-rows-[auto_1fr] gap-5">
          <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2">
            <WallKpiCard label="Servers" value={servers} detail={`${Math.round((servers / Math.max(total, 1)) * 100)}% of estate`} />
            <WallKpiCard label="Endpoints" value={endpoints} detail={`${Math.round((endpoints / Math.max(total, 1)) * 100)}% of estate`} />
            <WallKpiCard label="Network" value={network} detail={`${Math.round((network / Math.max(total, 1)) * 100)}% of estate`} />
            <WallKpiCard label="Cloud" value={cloud} detail={`${Math.round((cloud / Math.max(total, 1)) * 100)}% of estate`} />
          </div>
          <GlassPanel className="min-h-0 overflow-hidden p-5">
            <WallSectionHeading label="Estate mix" detail="Infrastructure composition" />
            <div className="mt-5 grid min-h-[240px] grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] items-center gap-5 max-md:grid-cols-1">
              <DonutChart data={composition} />
              <ChartLegend data={composition} />
            </div>
          </GlassPanel>
        </div>
      </div>
    </WallViewFrame>
  );
}

export function PostureTrend({ filters, slot }: WallViewProps) {
  const sites = getScopedSites(filters);
  const points = trendPoints(filters);
  const current = avg(sites.map(site => site.postureScore));
  const prior = points.at(-2)?.posture ?? current;
  const delta = current - prior;
  const status = statusFromScore(current);

  return (
    <WallViewFrame
      title="Posture Trend"
      kicker="Security index movement"
      filters={filters}
      slot={slot}
      hero={(
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <WallHeroStat
            label="Current posture"
            value={current}
            detail="Composite security posture index across active wall scope and selected time range."
            trend={`${signedValue(delta)} vs prior`}
            tone={toneFromScore(current)}
            icon={<TrendingUp className="h-8 w-8" />}
          />
          <WallKpiCard label="Exposure" value={points.at(-1)?.exposure ?? current} detail="Latest line" tone={toneFromScore(points.at(-1)?.exposure ?? current)} />
          <WallKpiCard label="Asset health" value={points.at(-1)?.assets ?? current} detail="IT + OT blend" tone={toneFromScore(points.at(-1)?.assets ?? current)} />
        </div>
      )}
    >
      <div className="grid h-full grid-cols-[1fr_260px] gap-5 pb-2">
        <GlassPanel className="flex min-h-0 flex-col p-5">
          <WallSectionHeading label="Posture movement" detail={`${filters.timeRange} trend by domain family`} />
          <div className="mt-5 min-h-[260px] min-w-0 flex-1 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ left: 0, right: 20, top: 14, bottom: 6 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.09)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--sc-text-muted)" tick={{ fontSize: 14 }} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--sc-text-muted)" domain={[40, 100]} tick={{ fontSize: 14 }} tickLine={false} axisLine={false} width={42} />
                <RechartsTooltip contentStyle={{ background: '#081016', border: '1px solid var(--sc-border)', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="posture" stroke="var(--sc-primary)" strokeWidth={4} dot={false} />
                <Line type="monotone" dataKey="exposure" stroke="var(--sc-status-critical)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="assets" stroke="var(--sc-status-ok)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="people" stroke="var(--sc-status-watch)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
        <GlassPanel className="p-5">
          <WallSectionHeading label="Legend" detail="Readable wall lines" />
          <div className="mt-5 grid gap-3">
            {[
              ['Posture', 'var(--sc-primary)'],
              ['Exposure', 'var(--sc-status-critical)'],
              ['Assets', 'var(--sc-status-ok)'],
              ['People', 'var(--sc-status-watch)'],
            ].map(([label, color]) => (
              <div key={label} className="flex items-center justify-between rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 px-3 py-3">
                <span className="flex items-center gap-2 text-[16px] text-[var(--sc-text-strong)]">
                  <span className="h-2 w-7 rounded-full" style={{ background: color }} />
                  {label}
                </span>
              </div>
            ))}
            <div className="mt-2 rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 p-4">
              <p className="font-mono text-[13px] uppercase tracking-[0.1em] text-[var(--sc-text-muted)]">Current status</p>
              <div className="mt-3"><WallStatusPill status={status} /></div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </WallViewFrame>
  );
}

export function ActivityFeed({ filters, slot }: WallViewProps) {
  const scoped = getScopedSites(filters);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(value => value + 1), 4500);
    return () => clearInterval(id);
  }, []);
  const events = buildWallEvents(scoped, 16);
  const visible = events.length
    ? Array.from({ length: Math.min(13, events.length) }, (_, index) => events[(index + tick) % events.length])
    : [];
  const critical = events.filter(event => event.severity === 'CRITICAL').length;

  return (
    <WallViewFrame
      title="Activity Feed"
      kicker="Live operational timeline"
      filters={filters}
      slot={slot}
      hero={(
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <WallHeroStat
            label="Recent events"
            value={events.length}
            detail="Rolling activity timeline across the selected site or enterprise scope."
            trend="Rotates every 4.5s"
            tone="primary"
            icon={<Activity className="h-8 w-8" />}
          />
          <WallKpiCard label="Critical" value={critical} detail="In current feed" tone={critical > 0 ? 'critical' : 'ok'} />
          <WallKpiCard label="Visible rows" value={visible.length} detail="On this screen" tone="neutral" />
        </div>
      )}
    >
      <GlassPanel className="flex h-full min-h-0 flex-col overflow-hidden p-5">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 styled-scrollbar">
          {visible.map((event, index) => (
            <div
              key={`${event.site}-${event.title}-${index}-${tick}`}
              className="grid min-h-[92px] grid-cols-[96px_44px_minmax(0,1fr)_160px] items-center gap-4 rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 px-4 py-3 transition-opacity duration-500 max-lg:grid-cols-[92px_minmax(0,1fr)]"
              style={{ opacity: 1 - index * 0.035 }}
            >
              <p className="font-mono text-[13px] text-[var(--sc-text-muted)]">{formatClockTime(event.time)}</p>
              <span className="grid h-8 w-8 place-items-center rounded-[var(--sc-radius)] bg-[var(--sc-hover)] text-[var(--sc-primary)] max-lg:hidden">
                <Activity className="h-4 w-4" />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate text-[18px] font-semibold leading-snug text-[var(--sc-text-strong)]">{event.title}</p>
                <p className="truncate font-mono text-[12px] uppercase tracking-[0.1em]" style={{ color: SEVERITY_COLOR[event.severity] }}>
                  {event.domain} · {event.severity} · {event.site}
                </p>
              </div>
              <p className="truncate text-right text-[15px] text-[var(--sc-text-muted)] max-lg:hidden">{event.site}</p>
            </div>
          ))}
        </div>
      </GlassPanel>
    </WallViewFrame>
  );
}

export function KpiGrid({ filters, slot }: WallViewProps) {
  const sites = getScopedSites(filters);
  const cards = domainCards(sites);
  const average = avg(cards.map(card => card.value));
  const watchCount = cards.filter(card => card.status !== 'HEALTHY').length;

  return (
    <WallViewFrame
      title="Domain KPI Grid"
      kicker="Twelve-domain overview"
      filters={filters}
      slot={slot}
      hero={(
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <WallHeroStat
            label="Domain posture"
            value={average}
            detail="Average score across the twelve security domains in the current scope."
            trend={`${watchCount} domains to watch`}
            tone={toneFromScore(average)}
            icon={<Shield className="h-8 w-8" />}
          />
          <WallKpiCard label="Domains" value={cards.length} detail="Tracked functions" tone="neutral" />
          <WallKpiCard label="Watchlist" value={watchCount} detail="Watch or critical" tone={watchCount > 3 ? 'critical' : watchCount > 0 ? 'watch' : 'ok'} />
        </div>
      )}
    >
      <div className="grid h-full min-h-0 grid-cols-4 gap-4 overflow-y-auto pb-2 pr-1 styled-scrollbar max-xl:grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1">
        {cards.map(({ layer, value, status, trend }) => (
          <GlassPanel key={layer.key} className="flex min-h-[178px] flex-col justify-between p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-[12px] uppercase tracking-[0.1em] text-[var(--sc-text-muted)]">{layer.group}</p>
                <h2 className="mt-2 line-clamp-2 text-[17px] font-semibold leading-tight text-[var(--sc-text-strong)]">{layer.label}</h2>
              </div>
              <layer.Icon className="h-7 w-7 shrink-0 text-[var(--sc-primary)]" />
            </div>
            <div className="mt-4">
              <div className="flex items-end justify-between gap-3">
                <p className="font-mono text-[34px] font-semibold leading-none" style={{ color: STATUS_COLOR[status] }}>{value}</p>
                <WallStatusPill status={status} />
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full" style={{ width: `${value}%`, background: STATUS_COLOR[status] }} />
              </div>
              <div className="mt-3 grid grid-cols-8 items-end gap-1">
                {Array.from({ length: 8 }, (_, index) => (
                  <span
                    key={index}
                    className="rounded-sm"
                    style={{
                      height: `${8 + ((value + index * Math.max(1, trend + 4)) % 22)}px`,
                      background: index === 7 ? STATUS_COLOR[status] : 'rgba(255,255,255,0.12)',
                    }}
                  />
                ))}
              </div>
              <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.1em] text-[var(--sc-text-muted)]">{signedValue(trend)} trend</p>
            </div>
          </GlassPanel>
        ))}
      </div>
    </WallViewFrame>
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
    clickRate: avg(unitSites.map(site => site.domains.sim_campaigns.click_rate)),
  })).slice(0, 7);
  const chartData = byUnit.map(item => ({ name: item.unit, score: item.score }));

  return (
    <WallViewFrame
      title="Awareness Board"
      kicker="People and campaigns"
      filters={filters}
      slot={slot}
      hero={(
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <WallHeroStat
            label="Awareness completion"
            value={`${completion}%`}
            detail={`${trained} of ${total} assigned staff have completed awareness activities in scope.`}
            trend={`${clickRate}% campaign click rate`}
            tone={completion >= 85 ? 'ok' : completion >= 70 ? 'watch' : 'critical'}
            icon={<Users className="h-8 w-8" />}
          />
          <WallKpiCard label="Campaign sends" value={campaigns} detail={`${clicked} clicked`} tone={clickRate <= 5 ? 'ok' : clickRate <= 10 ? 'watch' : 'critical'} />
          <WallKpiCard label="Click rate" value={`${clickRate}%`} detail="Simulated campaigns" tone={clickRate <= 5 ? 'ok' : clickRate <= 10 ? 'watch' : 'critical'} />
        </div>
      )}
    >
      <div className="grid h-full min-h-0 grid-cols-2 gap-5 pb-2 max-lg:grid-cols-1">
        <GlassPanel className="flex min-h-0 flex-col p-5">
          <WallSectionHeading label="Business unit completion" detail="Average awareness completion by unit" />
          <div className="mt-5 min-h-[260px] min-w-0 flex-1 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: 0, right: 18, top: 14, bottom: 6 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.09)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--sc-text-muted)" tick={{ fontSize: 14 }} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--sc-text-muted)" domain={[50, 100]} tick={{ fontSize: 14 }} tickLine={false} axisLine={false} width={42} />
                <Area type="monotone" dataKey="score" stroke="var(--sc-primary)" fill="rgba(34,211,238,0.16)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
        <GlassPanel className="flex min-h-0 flex-col p-5">
          <WallSectionHeading label="Campaign watchlist" detail="Completion and simulated-campaign risk by unit" />
          <div className="mt-5 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 styled-scrollbar">
            {byUnit.map((unit, index) => (
              <RankedListRow
                key={unit.unit}
                rank={index + 1}
                title={unit.unit}
                meta={`${unit.score}% completion · ${unit.clickRate}% click rate`}
                value={`${unit.score}%`}
                status={statusFromScore(unit.score)}
              />
            ))}
          </div>
        </GlassPanel>
      </div>
    </WallViewFrame>
  );
}

export function BlankWallView({ filters, slot }: WallViewProps) {
  const [time, setTime] = useState<Date | null>(null);
  useEffect(() => {
    setTime(new Date());
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="absolute inset-0 grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_35%,rgba(34,211,238,0.08),transparent_32%),var(--sc-bg-0)] px-6 py-5 text-center text-[var(--sc-text)]">
      <GlassPanel className="w-[420px] p-8">
        <Shield className="mx-auto h-20 w-20 text-[var(--sc-primary)]" strokeWidth={1.4} />
        <h1 className="mt-6 text-[32px] font-semibold text-[var(--sc-text-strong)]">Sentinel</h1>
        <p className="mt-4 font-mono text-[22px] tracking-[0.08em] text-[var(--sc-primary)]">
          {time ? formatClockTime(time) : '--:--'}
        </p>
        <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--sc-text-muted)]">
          Slot {slot} · {formatScope(filters)}
        </p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--sc-text-subtle)]">DEMO DATA</p>
      </GlassPanel>
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
