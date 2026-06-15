'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Bell, ChartNoAxesCombined, Cpu, Gauge, Map, MonitorCog, Shield, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { WALL_VIEW_COMPONENTS } from '@/components/wall/WallViews';
import type { SiteRecord } from '@/data/sites';
import type { ViewId, WallFilters, WallSlot } from '@/server/wallState';

type ViewRendererProps = {
  view: ViewId;
  filters: WallFilters;
  slot: WallSlot;
  suppressTransition?: boolean;
  mode?: 'display' | 'preview' | 'control';
  onDraftSiteSelect?: (site: SiteRecord) => void;
  onDraftSiteClear?: () => void;
};

export const WALL_VIEW_META: Record<ViewId, {
  label: string;
  kicker: string;
  Icon: LucideIcon;
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

export function ViewRenderer({ view, filters, slot, suppressTransition = false, mode = 'display', onDraftSiteSelect, onDraftSiteClear }: ViewRendererProps) {
  const meta = WALL_VIEW_META[view];
  const Icon = meta.Icon;
  const WallView = WALL_VIEW_COMPONENTS[view];

  if (mode === 'preview') {
    return (
      <div className="flex h-full min-h-[120px] flex-col justify-between overflow-hidden rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-[var(--sc-bg-1)] p-3 text-[var(--sc-text)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--sc-primary)]">S{slot}</p>
            <h3 className="mt-1 text-sm font-semibold leading-tight text-[var(--sc-text-strong)]">{meta.label}</h3>
          </div>
          <Icon className="h-5 w-5 shrink-0 text-[var(--sc-primary)]" strokeWidth={1.8} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--sc-text-muted)]">
          <span>{filters.timeRange}</span>
          <span>{filters.activeDomains.length} domains</span>
          <span>{filters.selectedSiteId ? 'site' : 'enterprise'}</span>
        </div>
      </div>
    );
  }

  if (mode === 'control') {
    return (
      <div className="relative h-[72vh] min-h-[560px] overflow-hidden rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-[var(--sc-bg-1)]">
        <WallView
          filters={filters}
          slot={slot}
          mode="control"
          onDraftSiteSelect={onDraftSiteSelect}
          onDraftSiteClear={onDraftSiteClear}
        />
      </div>
    );
  }

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
        <WallView filters={filters} slot={slot} mode="display" />
      </motion.section>
    </AnimatePresence>
  );
}
