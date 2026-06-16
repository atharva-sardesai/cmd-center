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
import { Activity, Bell, Cpu, Server, Shield, TrendingUp, Users } from 'lucide-react';
import AnalyticsMapChrome from '@/components/AnalyticsMapChrome';
import CommandMap from '@/components/CommandMap';
import { GlassPanel } from '@/components/ui/glass-panel';
import { ALL_LAYERS } from '@/data/layerMap';
import { MASTER_SITES, SITE_BY_ID, type SevLevel, type SiteRecord, type StatusLevel } from '@/data/sites';
import { formatClockTime } from '@/lib/format';
import { INDIA_MAP_VIEW } from '@/lib/mapDefaults';
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

const SEVERITY_RANK: Record<SevLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

type WallTone = 'primary' | 'ok' | 'watch' | 'critical' | 'neutral';
type AlertLifecycle = 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED';

type WallAlertRow = {
  id: string;
  time: string;
  severity: SevLevel;
  status: AlertLifecycle;
  site: string;
  domain: string;
  title: string;
  summary: string;
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
      title: (site: SiteRecord) => `Externally reachable service cluster has ${site.domains.exposure.criticals} critical findings`,
      summary: (site: SiteRecord) => `Scanner correlation flagged exposed management paths and stale package signatures across ${site.businessUnit.toLowerCase()} assets.`,
      severity: (site: SiteRecord): SevLevel => site.domains.exposure.severity,
      score: (site: SiteRecord) => 100 - site.domains.exposure.score,
    },
    {
      domain: 'APP ASSURANCE',
      title: (site: SiteRecord) => `Release gate blocked by ${site.domains.app_assurance.openTests} open assurance tests`,
      summary: () => `Application evidence is incomplete for the active release window; validation owner required before promotion.`,
      severity: (site: SiteRecord): SevLevel => site.domains.app_assurance.status === 'CRITICAL' ? 'CRITICAL' : site.domains.app_assurance.status === 'WATCH' ? 'HIGH' : 'MEDIUM',
      score: (site: SiteRecord) => site.domains.app_assurance.findings,
    },
    {
      domain: 'ACCESS',
      title: (site: SiteRecord) => `Privileged access review spike: ${site.domains.access_recert.overdue} overdue decisions`,
      summary: () => `Identity analytics detected aging privileged grants and repeated failed-access bursts in the same operating window.`,
      severity: (site: SiteRecord): SevLevel => site.domains.access_recert.status === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      score: (site: SiteRecord) => site.domains.access_recert.overdue,
    },
    {
      domain: 'DLP',
      title: (site: SiteRecord) => `Outbound transfer blocked by data-loss policy after ${site.domains.dlp.incidents} hits`,
      summary: () => `Content inspection blocked a bundled export containing regulated markers and unusual destination patterns.`,
      severity: (site: SiteRecord): SevLevel => site.domains.dlp.status === 'HEALTHY' ? 'MEDIUM' : 'HIGH',
      score: (site: SiteRecord) => site.domains.dlp.incidents,
    },
    {
      domain: 'OT ASSETS',
      title: (site: SiteRecord) => `Control-network anomaly across ${site.domains.ot_assets.plcs} controller endpoints`,
      summary: () => `Telemetry drift indicates unexpected polling cadence between engineering workstations and segmented controllers.`,
      severity: (site: SiteRecord): SevLevel => site.domains.ot_assets.status === 'CRITICAL' ? 'CRITICAL' : site.domains.ot_assets.status === 'WATCH' ? 'HIGH' : 'MEDIUM',
      score: (site: SiteRecord) => 100 - site.domains.ot_assets.score,
    },
    {
      domain: 'IT ASSETS',
      title: (site: SiteRecord) => `Configuration drift detected on ${site.domains.it_assets.servers} managed servers`,
      summary: () => `Baseline comparison found hardened settings reverted on monitored hosts with elevated service exposure.`,
      severity: (site: SiteRecord): SevLevel => site.domains.it_assets.status === 'CRITICAL' ? 'CRITICAL' : site.domains.it_assets.status === 'WATCH' ? 'HIGH' : 'MEDIUM',
      score: (site: SiteRecord) => site.domains.it_assets.servers,
    },
    {
      domain: 'ARCH REVIEW',
      title: (site: SiteRecord) => `Unapproved architecture exception opened for ${site.domains.arch_reviews.type}`,
      summary: (site: SiteRecord) => `${site.domains.arch_reviews.scheduled} reviews remain scheduled while compensating controls are still pending signoff.`,
      severity: (site: SiteRecord): SevLevel => site.domains.arch_reviews.status === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
      score: (site: SiteRecord) => 100 - site.domains.arch_reviews.score,
    },
    {
      domain: 'SIM CAMPAIGN',
      title: (site: SiteRecord) => `Phishing simulation produced ${site.domains.sim_campaigns.clicked} credential-risk clicks`,
      summary: (site: SiteRecord) => `${site.domains.sim_campaigns.click_rate}% click-through exceeded the local peer baseline for the current campaign wave.`,
      severity: (site: SiteRecord): SevLevel => site.domains.sim_campaigns.click_rate > 10 ? 'HIGH' : site.domains.sim_campaigns.click_rate > 5 ? 'MEDIUM' : 'LOW',
      score: (site: SiteRecord) => site.domains.sim_campaigns.click_rate,
    },
    {
      domain: 'GOVERNANCE',
      title: (site: SiteRecord) => `Application inventory drift: ${site.domains.app_governance.non_compliant} services out of policy`,
      summary: () => `Ownership, review evidence, or control mapping changed since the last governance snapshot.`,
      severity: (site: SiteRecord): SevLevel => site.domains.app_governance.status === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM',
      score: (site: SiteRecord) => site.domains.app_governance.non_compliant + site.domains.app_governance.review_due,
    },
    {
      domain: 'RETENTION',
      title: (site: SiteRecord) => `Activity retention gap below target at ${site.domains.activity_retention.coverage_pct}% coverage`,
      summary: (site: SiteRecord) => `${site.domains.activity_retention.days_retained} days retained in scope; restore pipeline needs verification before closeout.`,
      severity: (site: SiteRecord): SevLevel => site.domains.activity_retention.status === 'CRITICAL' ? 'HIGH' : 'LOW',
      score: (site: SiteRecord) => 100 - site.domains.activity_retention.coverage_pct,
    },
  ];
  const statuses: AlertLifecycle[] = ['NEW', 'INVESTIGATING', 'ACKNOWLEDGED', 'NEW', 'RESOLVED', 'INVESTIGATING'];

  const rows = sites.flatMap(site => domainTemplates.map((template, index) => ({
    id: `${site.id}-${template.domain}-${index}`,
    time: offsetTime(site.recentActivity[index % site.recentActivity.length]?.time ?? new Date().toISOString(), index * 13 + sites.indexOf(site) * 5),
    severity: template.severity(site),
    status: statuses[(index + STATUS_RANK[site.domains.posture_index.status]) % statuses.length],
    site: site.name,
    domain: template.domain,
    title: template.title(site),
    summary: template.summary(site),
    sort: SEVERITY_RANK[template.severity(site)] * 10000 + STATUS_RANK[site.domains.posture_index.status] * 1000 + template.score(site),
  })));

  return rows
    .sort((a, b) => b.sort - a.sort || new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, count)
    .map(row => ({
      id: row.id,
      time: row.time,
      severity: row.severity,
      status: row.status,
      site: row.site,
      domain: row.domain,
      title: row.title,
      summary: row.summary,
    }));
}

function buildWallEvents(sites: SiteRecord[], count: number): WallAlertRow[] {
  const activityRows = sites.flatMap(site => site.recentActivity.map((activity, index) => ({
    id: `${site.id}-activity-${index}`,
    time: offsetTime(activity.time, index * 11),
    severity: activity.severity,
    status: index % 4 === 0 ? 'NEW' as AlertLifecycle : index % 3 === 0 ? 'ACKNOWLEDGED' as AlertLifecycle : 'INVESTIGATING' as AlertLifecycle,
    site: site.name,
    domain: activity.type.toUpperCase(),
    title: activity.title,
    summary: `${site.businessUnit} signal correlated from the local activity stream and queued for analyst review.`,
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

export function MapWallView({ filters, mode = 'display', onDraftSiteSelect }: WallViewProps) {
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
          flyToLocation={selected
            ? { lat: selected.lat, lng: selected.lng, zoom: 5.5, ts: Date.now() }
            : { ...INDIA_MAP_VIEW, ts: Date.now() }}
          projection="globe"
          mapStyle="dark"
          markerScale={0.62}
          markerOpacity={0.55}
          interactive={mode === 'control'}
          onSiteClick={mode === 'control' ? onDraftSiteSelect : undefined}
        />
      </MapErrorBoundary>
      <AnalyticsMapChrome selectedSite={selected ?? null} />
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
      <div className="absolute bottom-10 left-10 rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/50 px-6 py-4 font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--sc-text-muted)]">
        WebGL fallback map
      </div>
    </div>
  );
}

export function AlertsBoard({ filters, slot }: WallViewProps) {
  const scoped = getScopedSites(filters);
  const alerts = buildWallAlerts(scoped, 18)
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || new Date(b.time).getTime() - new Date(a.time).getTime());
  const critical = alerts.filter(alert => alert.severity === 'CRITICAL').length;
  const high = alerts.filter(alert => alert.severity === 'HIGH').length;
  const active = alerts.filter(alert => alert.status !== 'RESOLVED').length;
  const newCount = alerts.filter(alert => alert.status === 'NEW').length;
  const unresolved = alerts.filter(alert => alert.status !== 'RESOLVED');
  const oldestUnresolved = unresolved.length
    ? Math.max(1, Math.round((Date.now() - Math.min(...unresolved.map(alert => new Date(alert.time).getTime()))) / 60000))
    : 0;
  const bySeverity = (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as SevLevel[]).map(severity => ({
    label: severity,
    value: alerts.filter(alert => alert.severity === severity).length,
    color: SEVERITY_COLOR[severity],
  }));
  const byDomain = Array.from(new Map(alerts.map(alert => [alert.domain, alerts.filter(item => item.domain === alert.domain).length])))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const bySite = Array.from(new Map(alerts.map(alert => [alert.site, alerts.filter(item => item.site === alert.site).length])))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const volume = buildSocTriageVolume(alerts);

  return (
    <WallViewFrame
      title="SOC Triage Console"
      kicker="Live alert operations"
      filters={filters}
      slot={slot}
      hero={(
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[260px_190px_190px_minmax(360px,1fr)]">
          <GlassPanel className="relative overflow-hidden p-5">
            <div className="absolute inset-y-0 left-0 w-2 bg-[var(--sc-status-critical)]" />
            <p className="font-mono text-[13px] uppercase tracking-[0.16em] text-[var(--sc-status-critical)]">Critical queue</p>
            <p className="mt-3 font-mono text-[76px] font-semibold leading-none text-[var(--sc-text-strong)]">{critical}</p>
            <p className="mt-3 text-[16px] text-[var(--sc-text-muted)]">{active} active alerts · {newCount} new signals</p>
          </GlassPanel>
          <GlassPanel className="p-5">
            <p className="font-mono text-[13px] uppercase tracking-[0.16em] text-[var(--sc-text-muted)]">High severity</p>
            <p className="mt-4 font-mono text-[48px] font-semibold leading-none text-[var(--sc-status-watch)]">{high}</p>
            <p className="mt-3 text-[15px] text-[var(--sc-text-muted)]">Needs owner assignment</p>
          </GlassPanel>
          <GlassPanel className="p-5">
            <p className="font-mono text-[13px] uppercase tracking-[0.16em] text-[var(--sc-text-muted)]">Oldest open</p>
            <p className="mt-4 font-mono text-[48px] font-semibold leading-none text-[var(--sc-text-strong)]">{oldestUnresolved}m</p>
            <p className="mt-3 text-[15px] text-[var(--sc-text-muted)]">Mean triage timer</p>
          </GlassPanel>
          <GlassPanel className="min-h-[170px] p-5">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[13px] uppercase tracking-[0.16em] text-[var(--sc-primary)]">Alert volume · last 24h</p>
                <p className="mt-1 text-[15px] text-[var(--sc-text-muted)]">Hourly count with dominant severity color</p>
              </div>
              <Bell className="h-8 w-8 text-[var(--sc-primary)]" />
            </div>
            <SocAlertVolumeBars data={volume} />
          </GlassPanel>
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
        <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_360px] gap-5 pb-2 max-xl:grid-cols-1">
          <GlassPanel className="flex min-h-0 flex-col overflow-hidden p-5">
            <div className="flex items-end justify-between gap-4 border-b border-[var(--sc-border)] pb-4">
              <div>
                <p className="font-mono text-[14px] uppercase tracking-[0.16em] text-[var(--sc-primary)]">Prioritized feed</p>
                <p className="mt-1 text-[15px] text-[var(--sc-text-muted)]">Critical-first, then newest unresolved events</p>
              </div>
              <p className="font-mono text-[13px] uppercase tracking-[0.12em] text-[var(--sc-text-muted)]">{alerts.length} rows</p>
            </div>
            <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 styled-scrollbar">
              {alerts.map((alert, index) => (
                <SocAlertTriageRow key={alert.id} alert={alert} index={index} />
              ))}
            </div>
          </GlassPanel>
          <div className="grid min-h-0 grid-rows-[minmax(280px,0.95fr)_minmax(300px,1.05fr)] gap-5">
            <GlassPanel className="min-h-0 overflow-hidden p-5">
              <WallSectionHeading label="Severity mix" detail="Current alert queue" />
              <div className="mt-4 grid min-h-[220px] grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] items-center gap-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={bySeverity} dataKey="value" nameKey="label" innerRadius="48%" outerRadius="82%" paddingAngle={3} stroke="rgba(3,7,12,0.75)" strokeWidth={3}>
                      {bySeverity.map(item => <Cell key={item.label} fill={item.color} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ background: '#081016', border: '1px solid var(--sc-border)', borderRadius: 8, fontSize: 14 }} />
                  </PieChart>
                </ResponsiveContainer>
                <ChartLegend data={bySeverity} />
              </div>
            </GlassPanel>
            <GlassPanel className="min-h-0 overflow-hidden p-5">
              <WallSectionHeading label="Domain load" detail="Top alerting sources and sites" />
              <div className="mt-5 grid gap-5 overflow-y-auto pr-1 styled-scrollbar">
                <SocRankedAlertList label="Domains" rows={byDomain} total={alerts.length} />
                <SocRankedAlertList label="Sites" rows={bySite} total={alerts.length} />
              </div>
            </GlassPanel>
          </div>
        </div>
      )}
    </WallViewFrame>
  );
}

function socAlertSurfaceStyle(severity: SevLevel) {
  if (severity === 'CRITICAL') {
    return {
      borderColor: 'color-mix(in srgb, var(--sc-status-critical) 58%, var(--sc-border))',
      background: 'linear-gradient(90deg, color-mix(in srgb, var(--sc-status-critical) 13%, transparent), rgba(0,0,0,0.22) 42%)',
      opacity: 1,
    };
  }
  if (severity === 'HIGH') {
    return {
      borderColor: 'color-mix(in srgb, var(--sc-status-watch) 48%, var(--sc-border))',
      background: 'linear-gradient(90deg, color-mix(in srgb, var(--sc-status-watch) 10%, transparent), rgba(0,0,0,0.20) 42%)',
      opacity: 0.96,
    };
  }
  if (severity === 'LOW') {
    return {
      borderColor: 'var(--sc-border)',
      background: 'rgba(0,0,0,0.14)',
      opacity: 0.68,
    };
  }
  return {
    borderColor: 'var(--sc-border)',
    background: 'rgba(0,0,0,0.20)',
    opacity: 0.86,
  };
}

function SocAlertTriageRow({ alert, index }: { alert: WallAlertRow; index: number }) {
  const color = SEVERITY_COLOR[alert.severity];
  const style = socAlertSurfaceStyle(alert.severity);
  const isNewCritical = alert.severity === 'CRITICAL' && alert.status === 'NEW';

  return (
    <div
      className={`relative grid min-h-[136px] grid-cols-[12px_minmax(150px,0.28fr)_minmax(0,1fr)_150px] overflow-hidden rounded-[var(--sc-radius)] border transition-transform duration-500 hover:translate-x-1 max-lg:grid-cols-[10px_minmax(0,1fr)] ${isNewCritical ? 'animate-pulse' : ''}`}
      style={{ ...style, animationDelay: `${index * 65}ms` }}
    >
      <div style={{ background: color }} />
      <div className="flex flex-col justify-between gap-4 px-4 py-4 max-lg:col-start-2 max-lg:flex-row max-lg:items-center max-lg:border-b max-lg:border-[var(--sc-border)]">
        <span
          className="inline-flex w-fit items-center rounded-full px-3 py-1.5 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-black"
          style={{ background: color }}
        >
          {alert.severity}
        </span>
        <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] ${socAlertStatusChipClass(alert.status)}`}>
          {alert.status === 'NEW' && <span className="h-1.5 w-1.5 animate-ping rounded-full bg-current" />}
          {alert.status}
        </span>
      </div>
      <div className="min-w-0 px-4 py-4 max-lg:col-start-2">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[12px] uppercase tracking-[0.12em] text-[var(--sc-text-muted)]">
          <span className="text-[var(--sc-primary)]">{alert.domain}</span>
          <span>•</span>
          <span>{alert.site}</span>
          <span>•</span>
          <span>{formatClockTime(alert.time)}</span>
        </div>
        <h3 className="mt-2 text-[22px] font-semibold leading-tight text-[var(--sc-text-strong)]">{alert.title}</h3>
        <p className="mt-2 text-[15px] leading-snug text-[var(--sc-text-muted)]">{alert.summary}</p>
      </div>
      <div className="flex flex-col items-end justify-center gap-2 px-4 py-4 text-right max-lg:hidden">
        <p className="font-mono text-[13px] uppercase tracking-[0.12em] text-[var(--sc-text-muted)]">Received</p>
        <p className="font-mono text-[26px] font-semibold leading-none text-[var(--sc-text-strong)]">{formatClockTime(alert.time)}</p>
        <p className="text-[13px] text-[var(--sc-text-subtle)]">Queue #{index + 1}</p>
      </div>
    </div>
  );
}

function socAlertStatusChipClass(status: AlertLifecycle) {
  if (status === 'NEW') return 'border-[var(--sc-primary)] bg-[color-mix(in_srgb,var(--sc-primary)_18%,transparent)] text-[var(--sc-primary)]';
  if (status === 'INVESTIGATING') return 'border-[var(--sc-status-watch)] bg-[color-mix(in_srgb,var(--sc-status-watch)_14%,transparent)] text-[var(--sc-status-watch)]';
  if (status === 'ACKNOWLEDGED') return 'border-[var(--sc-text-muted)] bg-white/5 text-[var(--sc-text-muted)]';
  return 'border-[var(--sc-status-ok)] bg-[color-mix(in_srgb,var(--sc-status-ok)_12%,transparent)] text-[var(--sc-status-ok)]';
}

function buildSocTriageVolume(alerts: WallAlertRow[]) {
  const buckets = Array.from({ length: 24 }, (_, index) => {
    const hour = 23 - index;
    const rows = alerts.filter((_, alertIndex) => (alertIndex * 3 + SEVERITY_RANK[alerts[alertIndex].severity]) % 24 === hour);
    const fallbackSeverity: SevLevel = hour % 9 === 0 ? 'CRITICAL' : hour % 4 === 0 ? 'HIGH' : hour % 3 === 0 ? 'MEDIUM' : 'LOW';
    const dominant = rows.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])[0]?.severity ?? fallbackSeverity;
    return {
      label: `${24 - hour}h`,
      count: rows.length + (hour % 6 === 0 ? 2 : hour % 4 === 0 ? 1 : 0),
      severity: dominant,
    };
  }).reverse();

  return buckets;
}

function SocAlertVolumeBars({ data }: { data: Array<{ label: string; count: number; severity: SevLevel }> }) {
  const max = Math.max(1, ...data.map(item => item.count));
  return (
    <div className="flex h-[92px] items-end gap-1.5">
      {data.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex h-full flex-1 flex-col justify-end gap-1">
          <div
            className="min-h-2 rounded-t-sm opacity-90"
            style={{
              height: `${Math.max(10, (item.count / max) * 86)}%`,
              background: SEVERITY_COLOR[item.severity],
            }}
            title={`${item.count} alerts`}
          />
          {index % 6 === 0 && <span className="font-mono text-[9px] text-[var(--sc-text-subtle)]">{item.label}</span>}
        </div>
      ))}
    </div>
  );
}

function SocRankedAlertList({ label, rows, total }: { label: string; rows: Array<[string, number]>; total: number }) {
  return (
    <div>
      <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--sc-text-muted)]">{label}</p>
      <div className="mt-3 grid gap-2">
        {rows.map(([name, value], index) => (
          <div key={name} className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-[15px] font-semibold text-[var(--sc-text-strong)]">{index + 1}. {name}</p>
              <p className="font-mono text-[22px] font-semibold text-[var(--sc-text-strong)]">{value}</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-[var(--sc-primary)]" style={{ width: `${Math.max(8, (value / Math.max(1, total)) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type DlpMetricTone = 'ok' | 'watch' | 'critical' | 'neutral';

function dlpMetricToneColor(tone: DlpMetricTone) {
  return tone === 'ok'
    ? 'var(--sc-status-ok)'
    : tone === 'watch'
      ? 'var(--sc-status-watch)'
      : tone === 'critical'
        ? 'var(--sc-status-critical)'
        : 'var(--sc-status-neutral)';
}

function sumDlpRecord<K extends string>(sites: SiteRecord[], select: (site: SiteRecord) => Record<K, number>): Record<K, number> {
  return sites.reduce((acc, site) => {
    const record = select(site);
    (Object.keys(record) as K[]).forEach(key => {
      acc[key] = (acc[key] ?? 0) + record[key];
    });
    return acc;
  }, {} as Record<K, number>);
}

function dlpTimelineLabel(index: number, range: WallFilters['timeRange']) {
  if (range === '1h') return `${index * 5}m`;
  if (range === '24h') return `${index * 2}h`;
  if (range === '7d') return `D-${11 - index}`;
  return `W-${11 - index}`;
}

function aggregateDlpTimeline(sites: SiteRecord[], range: WallFilters['timeRange']) {
  return Array.from({ length: 12 }, (_, index) => {
    const totals = sites.reduce((sum, site) => {
      const point = site.domains.dlp.timeline[index] ?? { alerts: 0, critical: 0, high: 0, medium: 0, low: 0 };
      return {
        alerts: sum.alerts + point.alerts,
        critical: sum.critical + point.critical,
        high: sum.high + point.high,
        medium: sum.medium + point.medium,
        low: sum.low + point.low,
      };
    }, { alerts: 0, critical: 0, high: 0, medium: 0, low: 0 });

    return {
      label: dlpTimelineLabel(index, range),
      ...totals,
    };
  });
}

function buildDlpTopSources(sites: SiteRecord[]) {
  if (sites.length === 1) return sites[0].domains.dlp.topSources;

  return sites
    .map(site => ({
      name: site.name,
      count: site.domains.dlp.incidents,
      status: site.domains.dlp.status,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);
}

function DlpHeadlineCard({ label, value, detail, tone }: {
  label: string;
  value: string | number;
  detail: string;
  tone: DlpMetricTone;
}) {
  const color = dlpMetricToneColor(tone);

  return (
    <GlassPanel className="relative min-h-[154px] overflow-hidden p-5">
      <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} />
      <p className="font-mono text-[13px] uppercase tracking-[0.16em] text-[var(--sc-text-muted)]">{label}</p>
      <p className="mt-4 font-mono text-[50px] font-semibold leading-none" style={{ color }}>{value}</p>
      <p className="mt-3 text-[15px] leading-snug text-[var(--sc-text-muted)]">{detail}</p>
    </GlassPanel>
  );
}

function DlpLegend({ items }: { items: Array<{ label: string; value: number; color: string }> }) {
  return (
    <div className="grid gap-2">
      {items.map(item => (
        <div key={item.label} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 px-3 py-2">
          <span className="flex min-w-0 items-center gap-2 text-[15px] font-semibold text-[var(--sc-text-strong)]">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: item.color }} />
            <span className="truncate">{item.label}</span>
          </span>
          <span className="font-mono text-[20px] font-semibold text-[var(--sc-text-strong)]">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function DlpDashboard({ filters, slot }: WallViewProps) {
  const sites = getScopedSites(filters);
  const totalAlerts = sumSites(sites, site => site.domains.dlp.incidents);
  const blocked = sumSites(sites, site => site.domains.dlp.blocked);
  const falsePositives = sumSites(sites, site => site.domains.dlp.falsePositives);
  const escalated = sumSites(sites, site => site.domains.dlp.escalated);
  const falsePositiveRate = totalAlerts ? Math.round((falsePositives / totalAlerts) * 100) : 0;
  const blockRate = totalAlerts ? Math.round((blocked / totalAlerts) * 100) : 0;
  const escalationRate = totalAlerts ? Math.round((escalated / totalAlerts) * 100) : 0;
  const timeline = aggregateDlpTimeline(sites, filters.timeRange);
  const protocols = sumDlpRecord(sites, site => site.domains.dlp.protocols);
  const recipients = sumDlpRecord(sites, site => site.domains.dlp.recipientCategories);
  const workerTypes = sumDlpRecord(sites, site => site.domains.dlp.workerTypes);
  const topSources = buildDlpTopSources(sites);
  const protocolRows = [
    { label: 'Email', value: protocols.email ?? 0, color: 'var(--sc-primary)' },
    { label: 'HTTPS', value: protocols.https ?? 0, color: 'var(--sc-status-ok)' },
    { label: 'Removable Device', value: protocols.removable ?? 0, color: 'var(--sc-status-watch)' },
    { label: 'Cloud Sync', value: protocols.sync ?? 0, color: 'var(--sc-status-neutral)' },
  ];
  const recipientRows = [
    { label: 'AI Tools', value: recipients.aiTools ?? 0 },
    { label: 'Personal Drive', value: recipients.personalDrive ?? 0 },
    { label: 'Vendor', value: recipients.vendor ?? 0 },
    { label: 'Internal', value: recipients.internal ?? 0 },
    { label: 'Partner', value: recipients.partner ?? 0 },
  ].sort((a, b) => b.value - a.value);
  const workerRows = [
    { label: 'Employee', value: workerTypes.employee ?? 0, color: 'var(--sc-primary)' },
    { label: 'Contractor', value: workerTypes.contractor ?? 0, color: 'var(--sc-status-watch)' },
    { label: 'Vendor', value: workerTypes.vendor ?? 0, color: 'var(--sc-status-neutral)' },
    { label: 'Partner', value: workerTypes.partner ?? 0, color: 'var(--sc-status-ok)' },
  ];
  const quiet = totalAlerts === 0;

  return (
    <WallViewFrame
      title="DLP Dashboard"
      kicker="Data-loss prevention posture"
      filters={filters}
      slot={slot}
      hero={(
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <DlpHeadlineCard label="Total alerts" value={totalAlerts} detail={`${sites.length} scoped ${sites.length === 1 ? 'site' : 'sites'} · ${filters.timeRange} wall range`} tone={totalAlerts > 24 ? 'watch' : 'neutral'} />
          <DlpHeadlineCard label="Blocked / prevented" value={blocked} detail={`${blockRate}% prevention rate across active policies`} tone={blockRate >= 65 ? 'ok' : blockRate >= 45 ? 'watch' : 'critical'} />
          <DlpHeadlineCard label="False positives" value={falsePositives} detail={`${falsePositiveRate}% review noise in the current queue`} tone={falsePositiveRate > 18 ? 'critical' : falsePositiveRate > 11 ? 'watch' : 'ok'} />
          <DlpHeadlineCard label="Escalated" value={escalated} detail={`${escalationRate}% routed to response ownership`} tone={escalationRate > 24 ? 'critical' : escalationRate > 14 ? 'watch' : 'neutral'} />
        </div>
      )}
    >
      {quiet ? (
        <GlassPanel className="grid h-full place-items-center p-10 text-center">
          <Shield className="mx-auto h-20 w-20 text-[var(--sc-status-ok)]" />
          <p className="mt-8 text-[34px] font-semibold text-[var(--sc-text-strong)]">No active DLP alerts</p>
          <p className="mt-3 text-[16px] text-[var(--sc-text-muted)]">The current wall scope has no DLP volume in this time range.</p>
        </GlassPanel>
      ) : (
        <div className="grid h-full min-h-0 grid-cols-[minmax(0,1.35fr)_minmax(440px,0.9fr)] gap-5 pb-2 max-2xl:grid-cols-1">
          <div className="grid min-h-0 grid-rows-[minmax(360px,1fr)_minmax(300px,0.8fr)] gap-5">
            <GlassPanel className="min-h-0 overflow-hidden p-5">
              <WallSectionHeading label="DLP alert timeline" detail={`Global wall range: ${filters.timeRange}; volume trend and severity mix`} />
              <div className="mt-4 h-[calc(100%-54px)] min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline} margin={{ left: 4, right: 18, top: 16, bottom: 8 }}>
                    <defs>
                      <linearGradient id="dlpAlertArea" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="var(--sc-primary)" stopOpacity={0.42} />
                        <stop offset="85%" stopColor="var(--sc-primary)" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--sc-text-muted)" tick={{ fontSize: 14 }} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--sc-text-muted)" tick={{ fontSize: 14 }} tickLine={false} axisLine={false} width={42} />
                    <RechartsTooltip contentStyle={{ background: '#081016', border: '1px solid var(--sc-border)', borderRadius: 8, fontSize: 14 }} />
                    <Area type="monotone" dataKey="alerts" name="Total alerts" stroke="var(--sc-primary)" strokeWidth={3} fill="url(#dlpAlertArea)" />
                    <Line type="monotone" dataKey="critical" name="Critical" stroke="var(--sc-status-critical)" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="high" name="High" stroke="var(--sc-status-watch)" strokeWidth={2.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassPanel>

            <div className="grid min-h-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-5 max-xl:grid-cols-1">
              <GlassPanel className="min-h-0 overflow-hidden p-5">
                <WallSectionHeading label="Alerts by protocol" detail="Channel composition" />
                <div className="mt-4 grid min-h-[220px] grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] items-center gap-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={protocolRows} dataKey="value" nameKey="label" innerRadius="48%" outerRadius="82%" paddingAngle={3} stroke="rgba(3,7,12,0.75)" strokeWidth={3}>
                        {protocolRows.map(item => <Cell key={item.label} fill={item.color} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ background: '#081016', border: '1px solid var(--sc-border)', borderRadius: 8, fontSize: 14 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <DlpLegend items={protocolRows} />
                </div>
              </GlassPanel>

              <GlassPanel className="min-h-0 overflow-hidden p-5">
                <WallSectionHeading label="Alerts by worker type" detail="Generic workforce categories" />
                <div className="mt-4 grid min-h-[220px] grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] items-center gap-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={workerRows} dataKey="value" nameKey="label" innerRadius="46%" outerRadius="82%" paddingAngle={3} stroke="rgba(3,7,12,0.75)" strokeWidth={3}>
                        {workerRows.map(item => <Cell key={item.label} fill={item.color} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ background: '#081016', border: '1px solid var(--sc-border)', borderRadius: 8, fontSize: 14 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <DlpLegend items={workerRows} />
                </div>
              </GlassPanel>
            </div>
          </div>

          <div className="grid min-h-0 grid-rows-[minmax(360px,1fr)_minmax(320px,0.85fr)] gap-5">
            <GlassPanel className="min-h-0 overflow-hidden p-5">
              <WallSectionHeading label="Alerts by recipient category" detail="Most leadership-relevant destinations" />
              <div className="mt-5 h-[calc(100%-58px)] min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recipientRows} layout="vertical" margin={{ left: 40, right: 24, top: 8, bottom: 8 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.07)" horizontal={false} />
                    <XAxis type="number" stroke="var(--sc-text-muted)" tick={{ fontSize: 14 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="label" stroke="var(--sc-text-muted)" tick={{ fontSize: 14 }} tickLine={false} axisLine={false} width={126} />
                    <RechartsTooltip contentStyle={{ background: '#081016', border: '1px solid var(--sc-border)', borderRadius: 8, fontSize: 14 }} />
                    <Bar dataKey="value" name="Alerts" radius={[0, 8, 8, 0]} fill="var(--sc-primary)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassPanel>

            <GlassPanel className="min-h-0 overflow-hidden p-5">
              <WallSectionHeading label="Top alert sources" detail="Where DLP volume is concentrated" />
              <div className="mt-5 flex max-h-[calc(100%-58px)] flex-col gap-3 overflow-y-auto pr-1 styled-scrollbar">
                {topSources.map((source, index) => (
                  <div key={source.name} className="grid grid-cols-[40px_minmax(0,1fr)_74px_92px] items-center gap-3 rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 px-3 py-3">
                    <span className="font-mono text-[14px] text-[var(--sc-text-subtle)]">#{index + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-semibold text-[var(--sc-text-strong)]">{source.name}</p>
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--sc-text-muted)]">DLP source group</p>
                    </div>
                    <p className="text-right font-mono text-[24px] font-semibold text-[var(--sc-text-strong)]">{source.count}</p>
                    <WallStatusPill status={source.status} />
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
  'dlp-dashboard': DlpDashboard,
  'ot-deep-dive': OTDeepDive,
  'it-deep-dive': ITDeepDive,
  'posture-trend': PostureTrend,
  'activity-feed': ActivityFeed,
  'kpi-grid': KpiGrid,
  'awareness-board': AwarenessBoard,
  blank: BlankWallView,
};
