'use client';

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { LAYER_GROUPS, ALL_LAYERS } from '@/data/layerMap';
import type { StatusLevel } from '@/data/sites';

type DomainSummary = { key: string; status?: StatusLevel };

const STATUS_COLORS: Record<StatusLevel | 'NEUTRAL', string> = {
  HEALTHY: 'var(--status-healthy)',
  WATCH: 'var(--status-watch)',
  CRITICAL: 'var(--status-critical)',
  NEUTRAL: 'var(--status-neutral)',
};

interface LayerPanelProps {
  data: { domains?: DomainSummary[] } & Record<string, unknown>;
  activeLayers: Record<string, boolean>;
  setActiveLayers: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

function LayerPanel({ data, activeLayers, setActiveLayers }: LayerPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(LAYER_GROUPS.map(g => [g.label, true]))
  );

  const toggle = (key: string) =>
    setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }));

  const getCount = (dataKeys: string[]): number | null => {
    if (!dataKeys.length) return null;
    let total = 0, found = false;
    for (const k of dataKeys) {
      if (data[k] && Array.isArray(data[k])) { total += data[k].length; found = true; }
    }
    return found ? total : null;
  };

  const getLayerStatusColor = (key: string) => {
    const status = data.domains?.find(d => d.key === key)?.status;
    return STATUS_COLORS[status ?? 'NEUTRAL'];
  };

  const totalEntities = ALL_LAYERS.reduce(
    (s, l) => s + (getCount(l.dataKeys) ?? 0), 0
  );
  const activeCount = Object.values(activeLayers).filter(Boolean).length;

  const toggleGroup = (label: string) =>
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));

  const toggleAllInGroup = (group: typeof LAYER_GROUPS[0]) => {
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
      <div className="p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Eye className="w-3.5 h-3.5 text-[var(--cyan-primary)]" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--alert-green)] animate-sentinel-pulse" />
          </div>
          <span className="hud-text text-[12px] text-[var(--text-primary)] tracking-widest">SECURITY DOMAINS</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`gotham-tag ${activeCount > 8 ? 'gotham-tag--critical' : activeCount > 4 ? 'gotham-tag--high' : 'gotham-tag--low'}`}
            style={{ fontSize: '8px', padding: '1px 6px' }}
          >
            {activeCount}/{ALL_LAYERS.length}
          </span>
          <span className="gotham-tag gotham-tag--info" style={{ fontSize: '7px', padding: '1px 5px' }}>
            {totalEntities.toLocaleString()} ENT
          </span>
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-1">
        {LAYER_GROUPS.map(group => {
          const isExpanded = expandedGroups[group.label];
          const groupActiveCount = group.layers.filter(l => activeLayers[l.key]).length;
          const allActive = groupActiveCount === group.layers.length;
          const GroupIcon = group.Icon;

          return (
            <div key={group.label}>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.03] transition-colors"
                >
                  <GroupIcon className="w-3 h-3 flex-shrink-0" style={{ color: groupActiveCount > 0 ? 'var(--accent-primary)' : 'var(--text-tertiary)' }} />
                  <span className="text-[9px] font-mono tracking-[0.15em] text-[var(--text-secondary)] font-bold flex-1 text-left">
                    {group.label}
                  </span>
                  <span
                    className="text-[8px] font-mono tabular-nums"
                    style={{ color: groupActiveCount > 0 ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}
                  >
                    {groupActiveCount}/{group.layers.length}
                  </span>
                  {isExpanded
                    ? <ChevronUp className="w-3 h-3 text-[var(--text-muted)]" />
                    : <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />}
                </button>
                <button
                  onClick={() => toggleAllInGroup(group)}
                  className="p-1 rounded hover:bg-white/[0.05] transition-colors"
                  title={allActive ? 'Disable all' : 'Enable all'}
                >
                  {allActive
                    ? <ToggleRight className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                    : <ToggleLeft className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                </button>
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
                    <div className="ml-2 pl-2 border-l border-[var(--border-secondary)]/40 space-y-px">
                      {group.layers.map(layer => {
                        const Icon = layer.Icon;
                        const isActive = activeLayers[layer.key];
                        const count = getCount(layer.dataKeys);
                        const statusColor = getLayerStatusColor(layer.key);
                        return (
                          <button
                            key={layer.key}
                            onClick={() => toggle(layer.key)}
                            title={layer.description}
                            className={`w-full flex items-center gap-2.5 px-2 py-[5px] rounded-md transition-all duration-200 group ${
                              isActive
                                ? 'bg-white/[0.04] border border-white/[0.06]'
                                : 'border border-transparent hover:bg-white/[0.02]'
                            }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300 ${isActive ? 'scale-100' : 'scale-50 opacity-30'}`}
                              style={{
                                backgroundColor: statusColor,
                                boxShadow: isActive ? `0 0 6px ${statusColor}` : 'none',
                              }}
                            />
                            <Icon
                              className="w-3.5 h-3.5 flex-shrink-0 transition-colors duration-200"
                              style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
                            />
                            <span
                              className={`text-[11px] font-mono tracking-wide flex-1 text-left transition-colors duration-200 ${
                                isActive
                                  ? 'text-[var(--text-primary)]'
                                  : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                              }`}
                            >
                              {layer.label}
                            </span>
                            {count !== null && (
                              <span
                                className="text-[9px] font-mono tabular-nums font-bold transition-colors duration-200"
                                style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
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
