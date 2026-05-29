'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, MapPin, AlertTriangle, Clock } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';

interface LiveAlertsProps {
  data: any;
  onLocate: (lat: number, lng: number) => void;
  onWatchFeed?: (url: string, name: string) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#EF4444',
  HIGH: '#EF4444',
  ELEVATED: '#F59E0B',
  MODERATE: '#F59E0B',
  LOW: '#10B981',
};

function riskToSeverity(score: number): string {
  if (score >= 8) return 'CRITICAL';
  if (score >= 6) return 'HIGH';
  if (score >= 4) return 'ELEVATED';
  return 'LOW';
}

export default function LiveAlerts({ data, onLocate }: LiveAlertsProps) {
  const [expanded, setExpanded] = useState(true);

  const alerts: any[] = (data.news || [])
    .filter((a: any) => a.coords?.length === 2)
    .slice(0, 15)
    .map((a: any) => ({
      title: a.title,
      source: a.source,
      lat: a.coords[0],
      lng: a.coords[1],
      time: a.published,
      severity: riskToSeverity(a.risk_score ?? 1),
    }));

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      className="pointer-events-auto"
    >
      <GlassPanel className="flex flex-col overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-3 py-2 hover:bg-[var(--hover-accent)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-[var(--alert-watch)]" />
          <span className="hud-text text-[10px] text-[var(--text-primary)]">LIVE ALERTS</span>
          <span className="gotham-tag gotham-tag--info" style={{ fontSize: '7px', padding: '1px 5px' }}>{alerts.length}</span>
          {criticalCount > 0 && (
            <span className="gotham-tag gotham-tag--critical" style={{ fontSize: '7px', padding: '1px 4px' }}>{criticalCount} HIGH</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--alert-watch)] animate-sentinel-pulse" />
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden px-2 pb-2"
          >
            <div className="space-y-0.5 max-h-[200px] overflow-y-auto styled-scrollbar">
              {alerts.length === 0 ? (
                <div className="text-center py-4 text-[10px] font-mono text-[var(--text-muted)]">
                  AWAITING ALERTS...
                </div>
              ) : alerts.map((alert, i) => {
                const sevColor = SEVERITY_COLORS[alert.severity] || '#F59E0B';
                return (
                  <button
                    key={i}
                    onClick={() => onLocate(alert.lat, alert.lng)}
                    className="w-full text-left p-2 rounded-lg hover:bg-[var(--hover-accent)] transition-all border border-transparent hover:border-[var(--border-primary)] group"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sevColor, boxShadow: `0 0 6px ${sevColor}60` }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-mono text-[var(--text-primary)] block truncate leading-tight mb-0.5">{alert.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-mono text-[var(--text-muted)]">{alert.source}</span>
                          {alert.time && (
                            <span className="text-[8px] font-mono text-[var(--text-muted)] flex items-center gap-0.5">
                              <Clock className="w-2 h-2" />
                              {new Date(alert.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <MapPin className="w-3 h-3 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </GlassPanel>
    </motion.div>
  );
}
