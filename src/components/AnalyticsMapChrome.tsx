'use client';

import DeskAnalyticsPanels from '@/components/DeskAnalyticsPanels';
import EnterpriseOverviewPanels from '@/components/EnterpriseOverviewPanels';
import { GlassPanel } from '@/components/ui/glass-panel';
import type { SiteRecord } from '@/data/sites';

interface AnalyticsMapChromeProps {
  selectedSite: SiteRecord | null;
}

export default function AnalyticsMapChrome({ selectedSite }: AnalyticsMapChromeProps) {
  const scopeName = selectedSite?.name ?? 'Enterprise-wide';

  return (
    <>
      <div className="desktop-panel pointer-events-none absolute left-1/2 top-16 z-[210] -translate-x-1/2">
        <GlassPanel className="px-4 py-2">
          <div className="text-center">
            <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
              Current scope
            </div>
            <div className="mt-1 text-[18px] font-medium text-[var(--text-primary)]">
              {scopeName}
            </div>
          </div>
        </GlassPanel>
      </div>

      <div className="desktop-panel pointer-events-none absolute bottom-12 left-5 top-16 z-[200] flex w-[320px] flex-col gap-3 overflow-y-auto pr-1 styled-scrollbar">
        {selectedSite
          ? <DeskAnalyticsPanels side="left" selectedSite={selectedSite} />
          : <EnterpriseOverviewPanels side="left" />}
      </div>

      <div className="desktop-panel pointer-events-none absolute bottom-12 right-5 top-16 z-[200] flex w-[320px] flex-col gap-3 overflow-y-auto pr-1 styled-scrollbar">
        {selectedSite
          ? <DeskAnalyticsPanels side="right" selectedSite={selectedSite} />
          : <EnterpriseOverviewPanels side="right" />}
      </div>
    </>
  );
}
