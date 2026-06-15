'use client';

import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { GlassPanel } from '@/components/ui/glass-panel';
import { MASTER_SITES } from '@/data/sites';
import type { SiteRecord, StatusLevel } from '@/data/sites';

type MetricRecord = Record<string, number>;
type Side = 'left' | 'right';

const COLORS = {
  accent: 'var(--accent-primary)',
  accentDim: 'var(--accent-primary-dim)',
  healthy: 'var(--status-healthy)',
  watch: 'var(--status-watch)',
  critical: 'var(--status-critical)',
  neutral: 'var(--status-neutral)',
  tertiary: 'var(--text-tertiary)',
};

const STATUS_COLOR: Record<StatusLevel, string> = {
  HEALTHY: COLORS.healthy,
  WATCH: COLORS.watch,
  CRITICAL: COLORS.critical,
};

function sumRecords(records: MetricRecord[]) {
  return records.reduce<MetricRecord>((totals, record) => {
    Object.entries(record).forEach(([key, value]) => {
      totals[key] = (totals[key] ?? 0) + value;
    });
    return totals;
  }, {});
}

function averageRecords(records: MetricRecord[]) {
  const totals = sumRecords(records);
  return Object.fromEntries(
    Object.entries(totals).map(([key, value]) => [key, Math.round(value / records.length)])
  );
}

function scopedAnalytics(selectedSite: SiteRecord | null) {
  const sites = selectedSite ? [selectedSite] : MASTER_SITES;
  const postureScore = selectedSite
    ? selectedSite.postureScore
    : Math.round(sites.reduce((sum, site) => sum + site.postureScore, 0) / sites.length);
  return {
    scope: selectedSite?.name ?? 'Enterprise-wide',
    appClassification: sumRecords(sites.map(site => site.deskAnalytics.appClassification)),
    vulnerabilitySeverity: sumRecords(sites.map(site => site.deskAnalytics.vulnerabilitySeverity)),
    devices: sumRecords(sites.map(site => site.domains.it_assets)),
    drStatus: sumRecords(sites.map(site => site.deskAnalytics.drStatus)),
    compliance: averageRecords(sites.map(site => site.deskAnalytics.compliance)),
    posture: selectedSite
      ? selectedSite.domains.posture_index
      : {
          score: postureScore,
          trend: Math.round(sites.reduce((sum, site) => sum + site.domains.posture_index.trend, 0) / sites.length),
          status: (postureScore >= 80 ? 'HEALTHY' : postureScore >= 65 ? 'WATCH' : 'CRITICAL') as StatusLevel,
        },
    criticalIssues: sites.reduce(
      (total, site) => total + Object.values(site.domains).filter(domain => domain.status === 'CRITICAL').length,
      0
    ),
  };
}

function PanelTitle({ title, scope }: { title: string; scope: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h2 className="text-[18px] font-medium text-[var(--text-primary)]">{title}</h2>
      <span className="max-w-28 truncate rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/[0.08] px-2 py-1 text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--accent-primary)]">
        {scope}
      </span>
    </div>
  );
}

function ChartPanel({ title, scope, children }: { title: string; scope: string; children: ReactNode }) {
  return (
    <GlassPanel className="pointer-events-auto min-h-0 flex-1">
      <div className="flex h-full min-h-[220px] flex-col gap-3 p-4">
        <PanelTitle title={title} scope={scope} />
        {children}
      </div>
    </GlassPanel>
  );
}

function Donut({
  data,
  colors,
  totalLabel,
}: {
  data: Array<{ name: string; value: number }>;
  colors: string[];
  totalLabel: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[46%_54%] items-center gap-3">
      <div className="relative h-[150px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={43} outerRadius={66} strokeWidth={0}>
              {data.map((item, index) => <Cell key={item.name} fill={colors[index]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[18px] font-medium tabular-nums text-[var(--text-primary)]">{total.toLocaleString()}</span>
          <span className="text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">{totalLabel}</span>
        </div>
      </div>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2 text-[14px] text-[var(--text-secondary)]">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[index] }} />
            <span className="min-w-0 flex-1 truncate">{item.name}</span>
            <span className="font-mono tabular-nums text-[var(--text-primary)]">{item.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeftPanels({ selectedSite }: { selectedSite: SiteRecord | null }) {
  const analytics = scopedAnalytics(selectedSite);
  const apps = [
    { name: 'Class 1', value: analytics.appClassification.class1 },
    { name: 'Class 2', value: analytics.appClassification.class2 },
    { name: 'Class 3', value: analytics.appClassification.class3 },
  ];
  const vulnerabilities = [
    { name: 'Critical', value: analytics.vulnerabilitySeverity.critical, color: COLORS.critical },
    { name: 'High', value: analytics.vulnerabilitySeverity.high, color: COLORS.watch },
    { name: 'Medium', value: analytics.vulnerabilitySeverity.medium, color: COLORS.neutral },
    { name: 'Low', value: analytics.vulnerabilitySeverity.low, color: COLORS.tertiary },
  ];
  const devices = [
    { name: 'Servers', value: analytics.devices.servers },
    { name: 'Endpoints', value: analytics.devices.endpoints },
    { name: 'Network', value: analytics.devices.network },
    { name: 'Cloud', value: analytics.devices.cloud },
  ];

  return (
    <>
      <ChartPanel title="Application Classification" scope={analytics.scope}>
        <Donut data={apps} colors={[COLORS.accent, COLORS.accentDim, COLORS.neutral]} totalLabel="Apps" />
      </ChartPanel>
      <ChartPanel title="Vulnerability Breakdown" scope={analytics.scope}>
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={vulnerabilities} margin={{ top: 12, right: 4, bottom: 0, left: -24 }}>
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} label={{ position: 'top', fill: 'var(--text-primary)', fontSize: 12 }}>
                {vulnerabilities.map(item => <Cell key={item.name} fill={item.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartPanel>
      <ChartPanel title="IT Inventory / Device Segregation" scope={analytics.scope}>
        <Donut data={devices} colors={[COLORS.accent, COLORS.healthy, COLORS.watch, COLORS.neutral]} totalLabel="Devices" />
      </ChartPanel>
    </>
  );
}

function PostureHero({ selectedSite }: { selectedSite: SiteRecord | null }) {
  const analytics = scopedAnalytics(selectedSite);
  const { posture, criticalIssues } = analytics;
  const color = STATUS_COLOR[posture.status];
  const Trend = posture.trend > 0 ? TrendingUp : posture.trend < 0 ? TrendingDown : Minus;
  return (
    <ChartPanel title="Security Posture" scope={analytics.scope}>
      <div className="flex min-h-0 flex-1 flex-col justify-center rounded-xl border border-[var(--border-hairline)] bg-white/[0.02] p-4">
        <div className="flex items-end gap-4">
          <span className="font-mono text-[80px] font-light leading-none tracking-[-0.06em] tabular-nums" style={{ color }}>
            {posture.score}
          </span>
          <span className="mb-3 flex items-center gap-2 font-mono text-[18px] font-medium tabular-nums" style={{ color }}>
            <Trend className="h-5 w-5" />
            {posture.trend > 0 ? '+' : ''}{posture.trend}
          </span>
        </div>
        <p className="mt-3 text-[14px] text-[var(--text-primary)]">
          {criticalIssues > 0 ? `${criticalIssues} critical issues require attention` : 'Security posture is healthy'}
        </p>
      </div>
    </ChartPanel>
  );
}

function RightPanels({ selectedSite }: { selectedSite: SiteRecord | null }) {
  const analytics = scopedAnalytics(selectedSite);
  const dr = [
    { name: 'Protected', value: analytics.drStatus.protected, color: COLORS.healthy },
    { name: 'At-Risk', value: analytics.drStatus.atRisk, color: COLORS.watch },
    { name: 'No-DR', value: analytics.drStatus.noDr, color: COLORS.critical },
  ];
  const drTotal = dr.reduce((sum, item) => sum + item.value, 0);
  const protectedPercent = Math.round((analytics.drStatus.protected / drTotal) * 100);
  const compliance = [
    { name: 'Framework A', value: analytics.compliance.frameworkA },
    { name: 'Framework B', value: analytics.compliance.frameworkB },
    { name: 'Framework C', value: analytics.compliance.frameworkC },
  ];

  return (
    <>
      <PostureHero selectedSite={selectedSite} />
      <ChartPanel title="DR Status" scope={analytics.scope}>
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[32px] font-medium tabular-nums text-[var(--status-healthy)]">{protectedPercent}%</span>
            <span className="text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Protected</span>
          </div>
          <div className="flex h-4 overflow-hidden rounded-full bg-white/[0.04]">
            {dr.map(item => <div key={item.name} style={{ width: `${(item.value / drTotal) * 100}%`, backgroundColor: item.color }} />)}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {dr.map(item => (
              <div key={item.name} className="min-w-0">
                <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="truncate">{item.name}</span>
                </div>
                <div className="mt-2 font-mono text-[14px] tabular-nums text-[var(--text-primary)]">{item.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </ChartPanel>
      <ChartPanel title="Compliance Status" scope={analytics.scope}>
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-4">
          {compliance.map(item => {
            const color = item.value >= 80 ? COLORS.healthy : item.value >= 65 ? COLORS.watch : COLORS.critical;
            return (
              <div key={item.name}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[14px] text-[var(--text-secondary)]">{item.name}</span>
                  <span className="font-mono text-[14px] tabular-nums" style={{ color }}>{item.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </ChartPanel>
    </>
  );
}

export default function DeskAnalyticsPanels({ side, selectedSite }: { side: Side; selectedSite: SiteRecord | null }) {
  return side === 'left' ? <LeftPanels selectedSite={selectedSite} /> : <RightPanels selectedSite={selectedSite} />;
}
