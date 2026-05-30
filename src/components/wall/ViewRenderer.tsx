'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Bell, ChartNoAxesCombined, Cpu, Gauge, Map, MonitorCog, Shield, Users } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { ALL_LAYERS } from '@/data/layerMap';
import type { ViewId, WallFilters, WallSlot } from '@/server/wallState';

type ViewRendererProps = {
  view: ViewId;
  filters: WallFilters;
  slot: WallSlot;
  suppressTransition?: boolean;
};

const VIEW_META: Record<ViewId, {
  label: string;
  kicker: string;
  Icon: typeof Map;
}> = {
  map: { label: 'Map View', kicker: 'Enterprise geography', Icon: Map },
  alerts: { label: 'Alerts Board', kicker: 'Prioritized event queue', Icon: Bell },
  'ot-deep-dive': { label: 'OT Deep Dive', kicker: 'Operational asset posture', Icon: Cpu },
  'it-deep-dive': { label: 'IT Deep Dive', kicker: 'Technology estate posture', Icon: MonitorCog },
  'posture-trend': { label: 'Posture Trend', kicker: 'Security index movement', Icon: ChartNoAxesCombined },
  'activity-feed': { label: 'Activity Feed', kicker: 'Live operational timeline', Icon: Activity },
  'kpi-grid': { label: 'KPI Grid', kicker: 'Twelve-domain overview', Icon: Gauge },
  'awareness-board': { label: 'Awareness Board', kicker: 'People and campaign focus', Icon: Users },
  blank: { label: 'Blank', kicker: 'Idle wall slot', Icon: Shield },
};

function domainLabel(key: string) {
  return ALL_LAYERS.find(layer => layer.key === key)?.label ?? key;
}

export function ViewRenderer({ view, filters, slot, suppressTransition = false }: ViewRendererProps) {
  const meta = VIEW_META[view];
  const Icon = meta.Icon;
  const activeLabels = filters.activeDomains.slice(0, 5).map(domainLabel);
  const remainingDomains = Math.max(filters.activeDomains.length - activeLabels.length, 0);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.section
        key={`${slot}-${view}`}
        className="absolute inset-0 grid place-items-center px-12 py-14"
        initial={suppressTransition ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={suppressTransition ? undefined : { opacity: 0 }}
        transition={{ duration: suppressTransition ? 0 : 0.4, ease: 'easeInOut' }}
      >
        <GlassPanel className="w-full max-w-[1680px] border-[var(--sc-border)] bg-[var(--sc-surface)] p-12">
          <div className="flex min-h-[68vh] flex-col justify-between gap-12">
            <div className="flex items-start justify-between gap-10">
              <div>
                <div className="mb-7 flex items-center gap-5">
                  <span className="grid h-20 w-20 place-items-center rounded-[var(--sc-radius)] border border-[var(--sc-border-strong)] bg-[var(--sc-hover)] text-[var(--sc-primary)]">
                    <Icon size={42} strokeWidth={1.8} />
                  </span>
                  <div className="font-mono text-[28px] uppercase tracking-[0.18em] text-[var(--sc-primary)]">
                    Slot {slot}
                  </div>
                </div>
                <p className="font-mono text-[28px] uppercase tracking-[0.16em] text-[var(--sc-text-muted)]">
                  {meta.kicker}
                </p>
                <h1 className="mt-5 text-[72px] font-semibold leading-[1.05] text-[var(--sc-text-strong)]">
                  {meta.label}
                </h1>
              </div>

              <div className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 px-7 py-5 text-right font-mono">
                <p className="text-[24px] uppercase tracking-[0.18em] text-[var(--sc-text-muted)]">View ID</p>
                <p className="mt-2 text-[34px] text-[var(--sc-text-strong)]">{view}</p>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <div className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 p-7">
                <p className="font-mono text-[24px] uppercase tracking-[0.16em] text-[var(--sc-text-muted)]">Site Scope</p>
                <p className="mt-3 text-[38px] font-semibold text-[var(--sc-text-strong)]">
                  {filters.selectedSiteId ?? 'Enterprise-wide'}
                </p>
              </div>
              <div className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 p-7">
                <p className="font-mono text-[24px] uppercase tracking-[0.16em] text-[var(--sc-text-muted)]">Time Range</p>
                <p className="mt-3 text-[80px] font-semibold leading-none text-[var(--sc-primary)]">
                  {filters.timeRange}
                </p>
              </div>
              <div className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 p-7">
                <p className="font-mono text-[24px] uppercase tracking-[0.16em] text-[var(--sc-text-muted)]">Active Domains</p>
                <p className="mt-3 text-[80px] font-semibold leading-none text-[var(--sc-text-strong)]">
                  {filters.activeDomains.length}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              {activeLabels.map(label => (
                <span
                  key={label}
                  className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-[var(--sc-hover)] px-5 py-3 text-[28px] text-[var(--sc-text)]"
                >
                  {label}
                </span>
              ))}
              {remainingDomains > 0 && (
                <span className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] px-5 py-3 text-[28px] text-[var(--sc-text-muted)]">
                  +{remainingDomains} more
                </span>
              )}
            </div>

            <div className="flex items-center justify-between font-mono text-[24px] uppercase tracking-[0.16em] text-[var(--sc-text-subtle)]">
              <span>Placeholder renderer</span>
              <span>DEMO DATA</span>
            </div>
          </div>
        </GlassPanel>
      </motion.section>
    </AnimatePresence>
  );
}
