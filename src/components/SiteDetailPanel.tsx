'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ReactNode } from 'react';
import type { DomainData, SiteRecord, StatusLevel } from '@/data/sites';
import { LAYER_MAP } from '@/data/layerMap';
import { formatClockTime, formatCount } from '@/lib/format';

interface Props {
  site: SiteRecord | null;
  onClose: () => void;
}

const STATUS_COLOR: Record<StatusLevel, string> = {
  HEALTHY: 'var(--status-healthy)', WATCH: 'var(--status-watch)', CRITICAL: 'var(--status-critical)',
};
const STATUS_RANK: Record<StatusLevel, number> = { HEALTHY: 0, WATCH: 1, CRITICAL: 2 };

const DOMAIN_ROWS: Array<keyof SiteRecord['domains']> = [
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

function domainLabel(key: keyof SiteRecord['domains']) {
  return key === 'posture_index' ? 'Posture Index' : LAYER_MAP[key]?.label ?? key;
}

function domainValue(key: keyof SiteRecord['domains'], site: SiteRecord) {
  switch (key) {
    case 'exposure':
      return `${site.domains.exposure.criticals}/${site.domains.exposure.findings}`;
    case 'app_assurance':
      return `${site.domains.app_assurance.findings} findings`;
    case 'arch_reviews':
      return `${site.domains.arch_reviews.completed}/${site.domains.arch_reviews.scheduled}`;
    case 'dlp':
      return `${site.domains.dlp.incidents} incidents`;
    case 'ot_assets':
      return `${site.domains.ot_assets.plcs + site.domains.ot_assets.hmis + site.domains.ot_assets.scada} assets`;
    case 'it_assets':
      return `${site.domains.it_assets.servers + site.domains.it_assets.endpoints + site.domains.it_assets.network + site.domains.it_assets.cloud} assets`;
    case 'awareness':
      return `${site.domains.awareness.completion_pct}%`;
    case 'sim_campaigns':
      return `${site.domains.sim_campaigns.click_rate}% clicks`;
    case 'access_recert':
      return `${site.domains.access_recert.overdue} overdue`;
    case 'app_governance':
      return `${site.domains.app_governance.non_compliant} gaps`;
    case 'activity_retention':
      return `${site.domains.activity_retention.coverage_pct}%`;
    case 'posture_index':
      return `${site.domains.posture_index.score}/100`;
  }
}

function statusPill(status: StatusLevel) {
  const color = STATUS_COLOR[status];
  return (
    <span
      className="rounded-full border px-2 py-1 text-[12px] font-medium uppercase tracking-[0.05em]"
      style={{ color, borderColor: color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      {status}
    </span>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="text-[18px] font-medium text-[var(--text-primary)]">
        {title}
      </div>
      {children}
    </section>
  );
}

function TrendGlyph({ trend }: { trend: number }) {
  if (trend > 0) return <TrendingUp className="h-5 w-5" />;
  if (trend < 0) return <TrendingDown className="h-5 w-5" />;
  return <Minus className="h-5 w-5" />;
}

function BreakdownCell({ name, value, status }: { name: string; value: string; status: StatusLevel }) {
  return (
    <div className="flex h-10 items-center gap-2 rounded-lg border border-[var(--border-hairline)] bg-white/[0.02] px-4 py-2">
      <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLOR[status] }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-normal text-[var(--text-secondary)]">{name}</div>
      </div>
      <div className="font-mono text-[14px] font-normal tabular-nums text-[var(--text-secondary)]">{value}</div>
    </div>
  );
}

function AssetMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[var(--border-hairline)] bg-white/[0.02] px-4 py-4">
      <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">{label}</div>
      <div className="mt-2 font-mono text-[14px] font-normal tabular-nums text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function getSiteDetailData(site: SiteRecord) {
  const posture = site.domains.posture_index;
  const postureColor = STATUS_COLOR[posture.status];
  const domainItems = DOMAIN_ROWS.map((key) => ({
    key,
    label: domainLabel(key),
    value: domainValue(key, site),
    domain: site.domains[key] as DomainData,
  }));
  const attentionItems = domainItems
    .filter(({ domain }) => domain.status === 'CRITICAL' || domain.status === 'WATCH')
    .sort((a, b) => STATUS_RANK[b.domain.status] - STATUS_RANK[a.domain.status] || a.domain.score - b.domain.score)
    .slice(0, 4);
  const criticalCount = domainItems.filter(({ domain }) => domain.status === 'CRITICAL').length;
  const watchCount = domainItems.filter(({ domain }) => domain.status === 'WATCH').length;
  const verdict = criticalCount > 0
    ? `${criticalCount} critical ${criticalCount === 1 ? 'issue requires' : 'issues require'} attention`
    : watchCount > 0
      ? `${watchCount} watch ${watchCount === 1 ? 'item needs' : 'items need'} monitoring`
      : 'Site posture is healthy';
  const liveAlerts = site.recentActivity.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH');
  const liveCritical = liveAlerts.filter(a => a.severity === 'CRITICAL').length;
  const liveHigh = liveAlerts.filter(a => a.severity === 'HIGH').length;
  const alertChipColor = liveCritical > 0 ? STATUS_COLOR.CRITICAL : STATUS_COLOR.WATCH;
  const alertSummary = liveCritical > 0 ? `${liveCritical} critical` : `${liveHigh} high`;

  return {
    site,
    posture,
    postureColor,
    domainItems,
    attentionItems,
    verdict,
    liveAlerts,
    alertChipColor,
    alertSummary,
  };
}

type SiteDetailData = ReturnType<typeof getSiteDetailData>;

function SiteDetailHeader({ detail, onClose }: { detail: SiteDetailData; onClose?: () => void }) {
  const { site, liveAlerts, alertChipColor, alertSummary } = detail;

  return (
    <div className="flex-shrink-0 border-b border-[var(--border-hairline)] px-6 py-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h2 className="min-w-0 truncate text-[32px] font-medium leading-none text-[var(--text-primary)]">
            {site.name}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-colors hover:bg-[var(--hover-accent)] hover:text-[var(--text-primary)]"
              aria-label="Close site detail panel"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[14px] font-normal text-[var(--text-secondary)]">
          <span>{site.businessUnit} · {site.region}</span>
          <span className="rounded-md border border-[var(--border-hairline)] bg-white/[0.02] px-2 py-1 font-mono text-[12px] text-[var(--text-tertiary)] tabular-nums">
            {site.lat.toFixed(4)}°, {site.lng.toFixed(4)}°
          </span>
        </div>
        {liveAlerts.length > 0 && (
          <div
            className="inline-flex w-fit items-center gap-2 rounded-full border px-2.5 py-1 text-[12px] font-medium uppercase tracking-[0.05em]"
            style={{ borderColor: alertChipColor, color: alertChipColor, background: `color-mix(in srgb, ${alertChipColor} 10%, transparent)` }}
          >
            <span>Live alerts</span>
            <span className="font-mono tabular-nums">{liveAlerts.length}</span>
            <span className="text-[var(--text-tertiary)]">{alertSummary}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SitePostureBlock({ detail }: { detail: SiteDetailData }) {
  const { site, posture, postureColor, verdict } = detail;

  return (
    <section className="min-h-[25%] space-y-3 rounded-xl border border-[var(--border-hairline)] bg-white/[0.02] p-5">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-end gap-4">
          <div
            className="font-mono text-[80px] font-light leading-none tracking-[-0.05em] tabular-nums"
            style={{ color: postureColor }}
          >
            {site.postureScore}
          </div>
          <div className="mb-4 flex items-center gap-2 text-[18px] font-medium" style={{ color: postureColor }}>
            <TrendGlyph trend={posture.trend} />
            <span className="font-mono tabular-nums">{posture.trend > 0 ? '+' : ''}{posture.trend}</span>
          </div>
        </div>
        <div className="mb-4 text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
          Overall posture
        </div>
      </div>
      <p className="text-[18px] font-medium text-[var(--text-primary)]">{verdict}</p>
    </section>
  );
}

function CriticalAttentionSection({ detail }: { detail: SiteDetailData }) {
  return (
    <Section title="Critical attention">
      {detail.attentionItems.length > 0 ? (
        <div className="space-y-2">
          {detail.attentionItems.map(({ key, label, value, domain }) => {
            const color = STATUS_COLOR[domain.status];
            return (
              <div
                key={key}
                className="flex min-h-[72px] items-center gap-4 rounded-xl border px-4 py-4"
                style={{ borderColor: color, background: `color-mix(in srgb, ${color} 10%, transparent)` }}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-normal" style={{ color }}>{label}</div>
                  <div className="mt-1 font-mono text-[14px] font-normal tabular-nums" style={{ color }}>{value}</div>
                </div>
                {statusPill(domain.status)}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border-hairline)] bg-white/[0.02] px-4 py-4 text-[14px] font-normal text-[var(--text-secondary)]">
          All domains healthy
        </div>
      )}
    </Section>
  );
}

export default function SiteDetailPanel({ site, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!site) return null;

  const detail = getSiteDetailData(site);
  const { domainItems, liveAlerts } = detail;

  return (
    <AnimatePresence>
      <motion.div
        key={site.id}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="pointer-events-auto h-full max-h-[calc(100dvh-112px)]"
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '100%' }}
      >
        <GlassPanel className="flex h-full max-h-full flex-col overflow-hidden">
        <SiteDetailHeader detail={detail} onClose={onClose} />

        <div className="flex-1 space-y-6 overflow-y-auto p-5 styled-scrollbar">
          <SitePostureBlock detail={detail} />
          <CriticalAttentionSection detail={detail} />

          <Section title="Full domain breakdown">
            <div className="grid grid-cols-2 gap-2">
              {domainItems.map(({ key, label, value, domain }) => (
                <BreakdownCell key={key} name={label} value={value} status={domain.status} />
              ))}
            </div>
          </Section>

          <Section title="Asset detail">
            <Tabs defaultValue="it" className="gap-4">
              <TabsList className="grid h-8 w-full grid-cols-3 bg-white/[0.04] text-[12px]">
                <TabsTrigger value="it" className="text-[12px] font-medium uppercase tracking-[0.05em]">IT</TabsTrigger>
                <TabsTrigger value="ot" className="text-[12px] font-medium uppercase tracking-[0.05em]">OT</TabsTrigger>
                <TabsTrigger value="retention" className="text-[12px] font-medium uppercase tracking-[0.05em]">Retention</TabsTrigger>
              </TabsList>
              <TabsContent value="it" className="grid grid-cols-2 gap-2">
                <AssetMetric label="Servers" value={formatCount(site.domains.it_assets.servers)} />
                <AssetMetric label="Endpoints" value={formatCount(site.domains.it_assets.endpoints)} />
                <AssetMetric label="Network" value={formatCount(site.domains.it_assets.network)} />
                <AssetMetric label="Cloud" value={formatCount(site.domains.it_assets.cloud)} />
              </TabsContent>
              <TabsContent value="ot" className="grid grid-cols-3 gap-2">
                <AssetMetric label="PLCs" value={site.domains.ot_assets.plcs} />
                <AssetMetric label="HMIs" value={site.domains.ot_assets.hmis} />
                <AssetMetric label="SCADA" value={site.domains.ot_assets.scada} />
              </TabsContent>
              <TabsContent value="retention" className="grid grid-cols-3 gap-2">
                <AssetMetric label="Coverage" value={`${site.domains.activity_retention.coverage_pct}%`} />
                <AssetMetric label="Days / 180" value={`${site.domains.activity_retention.days_retained}/180`} />
                <AssetMetric label="Status" value={site.domains.activity_retention.status} />
              </TabsContent>
            </Tabs>
          </Section>

          <Section title="Recent activity">
            <div className="space-y-2">
              {site.recentActivity.slice(0, 5).map((activity, index) => (
                <div key={`${activity.time}-${index}`} className="flex min-h-14 items-start gap-4 border-b border-[var(--border-hairline)] py-2 last:border-0">
                  <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--status-neutral)]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-normal text-[var(--text-secondary)]">{activity.title}</div>
                    <div className="mt-1 text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
                      {activity.type} · {formatClockTime(activity.time)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Live alerts">
            <div className="max-h-48 space-y-2 overflow-y-auto pr-1 styled-scrollbar">
              {liveAlerts.length === 0 ? (
                <div className="rounded-xl border border-[var(--border-hairline)] bg-white/[0.02] px-4 py-4 text-[14px] font-normal text-[var(--text-secondary)]">
                  No live alerts for this site
                </div>
              ) : liveAlerts.map((alert, index) => {
                const color = alert.severity === 'CRITICAL' ? STATUS_COLOR.CRITICAL : STATUS_COLOR.WATCH;
                return (
                  <div
                    key={`${alert.time}-${index}`}
                    className="flex min-h-14 items-start gap-4 rounded-xl border border-[var(--border-hairline)] bg-white/[0.02] px-4 py-3"
                  >
                    <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border" style={{ borderColor: color, color }}>
                      <AlertTriangle className="h-3 w-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-normal text-[var(--text-primary)]">{alert.title}</div>
                      <div className="mt-1 text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
                        {alert.severity} · {alert.type} · {formatClockTime(alert.time)}
                      </div>
                    </div>
                    <span
                      className="rounded-full border px-2 py-1 text-[12px] font-medium uppercase tracking-[0.05em]"
                      style={{ color, borderColor: color, background: `color-mix(in srgb, ${color} 10%, transparent)` }}
                    >
                      {alert.severity}
                    </span>
                  </div>
                );
              })}
            </div>
          </Section>

        </div>
        </GlassPanel>
      </motion.div>
    </AnimatePresence>
  );
}
