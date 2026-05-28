'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ChevronDown, ChevronUp, MapPin } from 'lucide-react';

interface IntelFeedProps {
  data: any;
  onLocate?: (lat: number, lng: number) => void;
}

function severityColor(score: number): string {
  if (score >= 8) return '#FF3D3D';
  if (score >= 6) return '#FF9500';
  if (score >= 4) return '#FFD700';
  return '#00E676';
}

function severityLabel(score: number): string {
  if (score >= 8) return 'CRITICAL';
  if (score >= 6) return 'HIGH';
  if (score >= 4) return 'WATCH';
  return 'OK';
}

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch { return ''; }
}

export default function IntelFeed({ data, onLocate }: IntelFeedProps) {
  const [expanded, setExpanded] = useState(true);
  const items: any[] = data.news || [];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.6 }}
      className="glass-panel flex flex-col overflow-hidden pointer-events-auto"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-4 py-3 hover:bg-[var(--hover-accent)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[var(--cyan-primary)]" />
          <span className="hud-text text-[12px] text-[var(--text-primary)]">ACTIVITY FEED</span>
          <span className="gotham-tag gotham-tag--info" style={{ fontSize: '8px', padding: '1px 5px' }}>
            {items.length}
          </span>
          {items.some((n: any) => n.risk_score >= 8) && (
            <span className="gotham-tag gotham-tag--critical" style={{ fontSize: '7px', padding: '1px 4px' }}>
              ALERTS
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--alert-green)] animate-sentinel-pulse" />
          {expanded
            ? <ChevronUp className="w-3 h-3 text-[var(--text-muted)]" />
            : <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="max-h-[400px] overflow-y-auto styled-scrollbar divide-y divide-[var(--border-secondary)]">
              {items.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <span className="text-[11px] font-mono text-[var(--text-muted)] tracking-widest">
                    AWAITING ACTIVITY...
                  </span>
                </div>
              ) : (
                items.slice(0, 30).map((item: any, i: number) => {
                  const color = severityColor(item.risk_score);
                  return (
                    <div
                      key={i}
                      className="px-4 py-2.5 hover:bg-[var(--hover-accent)] transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[9px] font-mono font-bold tracking-widest"
                          style={{ color }}
                        >
                          {severityLabel(item.risk_score)}
                        </span>
                        <span className="text-[8px] font-mono text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">
                          {item.source}
                        </span>
                        {item.coords && (
                          <button
                            onClick={() => onLocate?.(item.coords[0], item.coords[1])}
                            className="text-[var(--text-muted)] hover:text-[var(--cyan-primary)] transition-colors"
                          >
                            <MapPin className="w-2.5 h-2.5" />
                          </button>
                        )}
                        <span className="text-[8px] font-mono text-[var(--text-muted)] ml-auto">
                          {timeAgo(item.published)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-primary)] leading-tight line-clamp-2">
                        {item.title}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
