'use client';

import { TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ANALYTICS_COLORS,
  AnalyticsDonut,
  AnalyticsPanel,
} from '@/components/DeskAnalyticsPanels';
import { LAYER_MAP } from '@/data/layerMap';
import { MASTER_SITES } from '@/data/sites';
import type { SiteRecord, StatusLevel } from '@/data/sites';

type Side = 'left' | 'right';
type DomainKey = keyof SiteRecord['domains'];

const DOMAIN_KEYS: DomainKey[] = [
  'exposure',
  'app_assurance',
  'arch_reviews',
  'dlp',
  'ot_assets',
  'it_assets',
  'awareness',
  'sim_campaigns',
  'access_recert',
  'app_governance',
  'activity_retention',
  'posture_index',
];

const STATUS_COLOR: Record<StatusLevel, string> = {
  HEALTHY: ANALYTICS_COLORS.healthy,
  WATCH: ANALYTICS_COLORS.watch,
  CRITICAL: ANALYTICS_COLORS.critical,
};

function siteStatus(site: SiteRecord) {
  return site.domains.posture_index.status;
}

function totalItAssets(site: SiteRecord) {
  const assets = site.domains.it_assets;
  return assets.servers + assets.endpoints + assets.network + assets.cloud;
}

function totalOtAssets(site: SiteRecord) {
  const assets = site.domains.ot_assets;
  return assets.plcs + assets.hmis + assets.scada;
}

const statusBreakdown = (['HEALTHY', 'WATCH', 'CRITICAL'] as StatusLevel[]).map(status => ({
  name: status === 'HEALTHY' ? 'Healthy' : status === 'WATCH' ? 'Watch' : 'Critical',
  value: MASTER_SITES.filter(site => siteStatus(site) === status).length,
}));

const totalCriticals = MASTER_SITES.reduce(
  (sum, site) => sum + DOMAIN_KEYS.filter(key => site.domains[key].status === 'CRITICAL').length,
  0
);
const sitesAtRisk = MASTER_SITES.filter(site => siteStatus(site) === 'CRITICAL').length;
const totalFindings = MASTER_SITES.reduce((sum, site) => sum + site.domains.exposure.findings, 0);
const totalApps = MASTER_SITES.reduce(
  (sum, site) => sum + Object.values(site.deskAnalytics.appClassification).reduce((total, value) => total + value, 0),
  0
);
const totalIt = MASTER_SITES.reduce((sum, site) => sum + totalItAssets(site), 0);
const totalOt = MASTER_SITES.reduce((sum, site) => sum + totalOtAssets(site), 0);
const totalUsers = MASTER_SITES.reduce((sum, site) => sum + site.domains.access_recert.total_users, 0);
const postureIndex = Math.round(MASTER_SITES.reduce((sum, site) => sum + site.postureScore, 0) / MASTER_SITES.length);
const topRiskSites = [...MASTER_SITES].sort((a, b) => a.postureScore - b.postureScore).slice(0, 5);
const weakestDomains = DOMAIN_KEYS
  .filter(key => key !== 'posture_index')
  .map(key => ({
    key,
    name: LAYER_MAP[key]?.label ?? key,
    score: Math.round(MASTER_SITES.reduce((sum, site) => sum + site.domains[key].score, 0) / MASTER_SITES.length),
  }))
  .sort((a, b) => a.score - b.score)
  .slice(0, 5);

function StatGrid() {
  const stats = [
    { label: 'Sites', value: MASTER_SITES.length, color: ANALYTICS_COLORS.accent },
    { label: 'Sites at risk', value: sitesAtRisk, color: ANALYTICS_COLORS.critical },
    { label: 'Open criticals', value: totalCriticals, color: ANALYTICS_COLORS.critical },
    { label: 'Open findings', value: totalFindings, color: ANALYTICS_COLORS.watch },
    { label: 'Applications', value: totalApps, color: ANALYTICS_COLORS.accentDim },
    { label: 'Users in scope', value: totalUsers, color: ANALYTICS_COLORS.neutral },
  ];
  return (
    <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
      {stats.map(stat => (
        <div key={stat.label} className="flex flex-col justify-center rounded-xl border border-[var(--border-hairline)] bg-white/[0.02] p-3">
          <span className="text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">{stat.label}</span>
          <span className="mt-2 font-mono text-[18px] font-medium tabular-nums" style={{ color: stat.color }}>{stat.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function LeftOverview() {
  return (
    <>
      <AnalyticsPanel title="Estate Health">
        <AnalyticsDonut
          data={statusBreakdown}
          colors={[ANALYTICS_COLORS.healthy, ANALYTICS_COLORS.watch, ANALYTICS_COLORS.critical]}
          totalLabel="Sites"
        />
      </AnalyticsPanel>
      <AnalyticsPanel title="Program Signals">
        <StatGrid />
      </AnalyticsPanel>
      <AnalyticsPanel title="Asset Footprint">
        <AnalyticsDonut
          data={[
            { name: 'IT assets', value: totalIt },
            { name: 'OT assets', value: totalOt },
          ]}
          colors={[ANALYTICS_COLORS.accent, ANALYTICS_COLORS.watch]}
          totalLabel="Assets"
        />
      </AnalyticsPanel>
    </>
  );
}

function RightOverview() {
  const postureColor = postureIndex >= 80 ? ANALYTICS_COLORS.healthy : postureIndex >= 65 ? ANALYTICS_COLORS.watch : ANALYTICS_COLORS.critical;
  return (
    <>
      <AnalyticsPanel title="Overall Posture Index">
        <div className="flex min-h-0 flex-1 flex-col justify-center rounded-xl border border-[var(--border-hairline)] bg-white/[0.02] p-4">
          <div className="flex items-end gap-4">
            <span className="font-mono text-[80px] font-light leading-none tracking-[-0.06em] tabular-nums" style={{ color: postureColor }}>
              {postureIndex}
            </span>
            <TrendingUp className="mb-3 h-5 w-5" style={{ color: postureColor }} />
          </div>
          <p className="mt-3 text-[14px] text-[var(--text-primary)]">
            {sitesAtRisk} sites require priority attention
          </p>
        </div>
      </AnalyticsPanel>
      <AnalyticsPanel title="Top Sites by Risk">
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-2">
          {topRiskSites.map((site, index) => (
            <div key={site.id} className="flex items-center gap-3 rounded-lg border border-[var(--border-hairline)] bg-white/[0.02] px-3 py-2">
              <span className="font-mono text-[12px] text-[var(--text-tertiary)]">{String(index + 1).padStart(2, '0')}</span>
              <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--text-secondary)]">{site.name}</span>
              <span className="font-mono text-[14px] tabular-nums" style={{ color: STATUS_COLOR[siteStatus(site)] }}>{site.postureScore}</span>
            </div>
          ))}
        </div>
      </AnalyticsPanel>
      <AnalyticsPanel title="Domain Watchlist">
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weakestDomains} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis dataKey="name" type="category" width={112} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Bar dataKey="score" radius={[0, 6, 6, 0]} label={{ position: 'right', fill: 'var(--text-primary)', fontSize: 12 }}>
                {weakestDomains.map(domain => (
                  <Cell
                    key={domain.key}
                    fill={domain.score >= 80 ? ANALYTICS_COLORS.healthy : domain.score >= 65 ? ANALYTICS_COLORS.watch : ANALYTICS_COLORS.critical}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </AnalyticsPanel>
    </>
  );
}

export default function EnterpriseOverviewPanels({ side }: { side: Side }) {
  return side === 'left' ? <LeftOverview /> : <RightOverview />;
}
