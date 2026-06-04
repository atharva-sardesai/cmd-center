'use client';

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { LAYER_GROUPS } from '@/data/layerMap';
import type { SiteRecord, StatusLevel } from '@/data/sites';

type DomainSummary = { key: string; status?: StatusLevel };
type SecurityLayerKey = Exclude<keyof SiteRecord['domains'], 'posture_index'>;

const STATUS_COLORS: Record<StatusLevel | 'NEUTRAL', string> = {
  HEALTHY: 'var(--status-healthy)',
  WATCH: 'var(--status-watch)',
  CRITICAL: 'var(--status-critical)',
  NEUTRAL: 'var(--status-neutral)',
};

const VISIBLE_GROUPS = LAYER_GROUPS.filter(group => group.label !== 'DISPLAY');
const VISIBLE_LAYERS = VISIBLE_GROUPS.flatMap(group => group.layers);

interface LayerPanelProps {
  data: { domains?: DomainSummary[]; country_risk_domains?: DomainSummary[] } & Record<string, unknown>;
  activeLayers: Record<string, boolean>;
  setActiveLayers: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  selectedSite?: SiteRecord | null;
}

function getSiteLayerCount(site: SiteRecord, key: string): number | null {
  const domains = site.domains;
  switch (key as SecurityLayerKey) {
    case 'exposure':
      return domains.exposure.findings;
    case 'app_assurance':
      return domains.app_assurance.findings;
    case 'arch_reviews':
      return domains.arch_reviews.completed + domains.arch_reviews.scheduled;
    case 'dlp':
      return domains.dlp.incidents;
    case 'ot_assets':
      return domains.ot_assets.plcs + domains.ot_assets.hmis + domains.ot_assets.scada;
    case 'it_assets':
      return domains.it_assets.servers + domains.it_assets.endpoints + domains.it_assets.network + domains.it_assets.cloud;
    case 'awareness':
      return domains.awareness.trained;
    case 'sim_campaigns':
      return domains.sim_campaigns.sent;
    case 'access_recert':
      return domains.access_recert.overdue;
    case 'app_governance':
      return domains.app_governance.non_compliant;
    case 'activity_retention':
      return domains.activity_retention.days_retained;
    default:
      return null;
  }
}

function LayerPanel({ data, activeLayers, setActiveLayers, selectedSite }: LayerPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(VISIBLE_GROUPS.map(g => [g.label, true]))
  );

  const toggle = (key: string) =>
    setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }));

  const getCount = (key: string, dataKeys: string[]): number | null => {
    if (selectedSite) return getSiteLayerCount(selectedSite, key);
    if (!dataKeys.length) return null;
    let total = 0, found = false;
    for (const dataKey of dataKeys) {
      if (data[dataKey] && Array.isArray(data[dataKey])) { total += data[dataKey].length; found = true; }
    }
    return found ? total : null;
  };

  const getLayerStatusColor = (key: string) => {
    if (selectedSite && key in selectedSite.domains) {
      return STATUS_COLORS[selectedSite.domains[key as keyof SiteRecord['domains']].status];
    }
    const status = data.country_risk_domains?.find(d => d.key === key)?.status ?? data.domains?.find(d => d.key === key)?.status;
    return STATUS_COLORS[status ?? 'NEUTRAL'];
  };

  const totalEntities = VISIBLE_LAYERS.reduce(
    (sum, layer) => sum + (getCount(layer.key, layer.dataKeys) ?? 0), 0
  );
  const activeCount = VISIBLE_LAYERS.filter(layer => activeLayers[layer.key]).length;

  const toggleGroup = (label: string) =>
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));

  const toggleAllInGroup = (group: typeof VISIBLE_GROUPS[0]) => {
    const allActive = group.layers.every(l => activeLayers[l.key]);
    setActiveLayers(prev => {
      const next = { ...prev };
      group.layers.forEach(l => { next[l.key] = !allActive; });
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="pointer-events-auto"
    >
      <GlassPanel variant="left">
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Eye className="h-4 w-4 text-[var(--accent-primary)]" />
                <div className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--status-healthy)]" />
              </div>
              <span className="text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--text-primary)]">Security domains</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[var(--border-hairline)] px-2 py-1 font-mono text-[12px] font-medium tabular-nums text-[var(--text-secondary)]">
                {activeCount}/{VISIBLE_LAYERS.length}
              </span>
              <span className="rounded-full border border-[var(--border-hairline)] px-2 py-1 font-mono text-[12px] font-medium tabular-nums text-[var(--text-secondary)]">
                {totalEntities.toLocaleString()} ENT
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {VISIBLE_GROUPS.map(group => {
              const isExpanded = expandedGroups[group.label];
              const groupActiveCount = group.layers.filter(l => activeLayers[l.key]).length;
              const allActive = groupActiveCount === group.layers.length;
              const GroupIcon = group.Icon;

              return (
                <div key={group.label} className="space-y-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleGroup(group.label)}
                        className="flex flex-1 items-center gap-2 rounded-md py-1 text-left transition-colors hover:bg-white/[0.03]"
                      >
                        <GroupIcon className="h-3 w-3 flex-shrink-0" style={{ color: groupActiveCount > 0 ? 'var(--accent-primary)' : 'var(--text-tertiary)' }} />
                        <span className="flex-1 text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--text-secondary)]">
                          {group.label}
                        </span>
                        <span className="font-mono text-[12px] font-medium tabular-nums text-[var(--text-tertiary)]">
                          {groupActiveCount}/{group.layers.length}
                        </span>
                        {isExpanded
                          ? <ChevronUp className="h-3 w-3 text-[var(--text-tertiary)]" />
                          : <ChevronDown className="h-3 w-3 text-[var(--text-tertiary)]" />}
                      </button>
                      <button
                        onClick={() => toggleAllInGroup(group)}
                        className="rounded p-1 transition-colors hover:bg-white/[0.05]"
                        title={allActive ? 'Disable all' : 'Enable all'}
                      >
                        {allActive
                          ? <ToggleRight className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
                          : <ToggleLeft className="h-4 w-4 text-[var(--text-tertiary)]" />}
                      </button>
                    </div>
                    <div className="h-px bg-[var(--border-hairline)]" />
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-1">
                          {group.layers.map(layer => {
                            const Icon = layer.Icon;
                            const isActive = activeLayers[layer.key];
                            const count = getCount(layer.key, layer.dataKeys);
                            const statusColor = getLayerStatusColor(layer.key);
                            return (
                              <button
                                key={layer.key}
                                onClick={() => toggle(layer.key)}
                                title={layer.description}
                                className={`group flex h-11 w-full items-center gap-3 rounded-md border px-2 text-left transition-all duration-200 ${
                                  isActive
                                    ? 'border-white/[0.08] bg-white/[0.04]'
                                    : 'border-transparent hover:bg-white/[0.02]'
                                }`}
                              >
                                <span
                                  className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                                  style={{ backgroundColor: statusColor }}
                                />
                                <Icon
                                  className="h-4 w-4 flex-shrink-0 transition-colors duration-200"
                                  style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
                                />
                                <span
                                  className={`flex-1 truncate text-[14px] font-normal transition-colors duration-200 ${
                                    isActive
                                      ? 'text-[var(--text-primary)]'
                                      : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                                  }`}
                                >
                                  {layer.label}
                                </span>
                                {count !== null && (
                                  <span
                                    className="font-mono text-[14px] font-normal tabular-nums text-[var(--text-secondary)]"
                                  >
                                    {count.toLocaleString()}
                                  </span>
                                )}
                                <div className={`layer-toggle ${isActive ? 'active' : ''}`} />
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
}

export default memo(LayerPanel);
