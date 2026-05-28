'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { SiteRecord, SevLevel, StatusLevel } from '@/data/sites';
import { LAYER_MAP } from '@/data/layerMap';

interface Props {
  site: SiteRecord | null;
  onClose: () => void;
}

const SEV_COLOR: Record<SevLevel, string> = {
  CRITICAL: '#FF1744', HIGH: '#FF9500', MEDIUM: '#FFD700', LOW: '#00E676',
};
const STATUS_COLOR: Record<StatusLevel, string> = {
  HEALTHY: '#00E676', WATCH: '#FFD700', CRITICAL: '#FF3D3D',
};

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

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="text-center p-2 rounded" style={{ background: 'rgba(0,229,255,0.03)', border: '1px solid rgba(0,229,255,0.08)' }}>
      <div className="text-[8px] font-mono text-[var(--text-muted)] tracking-widest mb-0.5">{label}</div>
      <div className="text-[11px] font-mono font-bold" style={{ color: color || 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[8px] font-mono tracking-[0.25em] text-[var(--cyan-primary)] opacity-70">{title}</span>
        <div className="flex-1 h-px bg-[var(--border-secondary)]" />
      </div>
      {children}
    </div>
  );
}

export default function SiteDetailPanel({ site, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {site && (
        <motion.div
          key={site.id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="glass-panel flex flex-col overflow-hidden pointer-events-auto"
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '100%' }}
        >
          {/* ── Header ── */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--border-primary)]">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[8px] font-mono text-[var(--text-muted)] tracking-[0.2em] mb-0.5">
                  {site.region} · {site.businessUnit}
                </div>
                <h2 className="text-base font-bold font-mono tracking-[0.3em] text-[var(--text-heading)] truncate">
                  {site.name}
                </h2>
                <div className="text-[8px] font-mono text-[var(--text-muted)] mt-0.5 tabular-nums">
                  {site.lat.toFixed(4)}°{'  '}{site.lng.toFixed(4)}°
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-center">
                  <div className="text-[7px] font-mono text-[var(--text-muted)] tracking-widest">POSTURE</div>
                  <div
                    className="text-xl font-bold font-mono tabular-nums"
                    style={{ color: STATUS_COLOR[site.domains.posture_index.status] }}
                  >
                    {site.postureScore}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-6 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-accent)] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto styled-scrollbar px-3 py-2 space-y-3">

            {/* Domain Posture */}
            <Section title="DOMAIN POSTURE">
              <div className="space-y-0.5">
                {DOMAIN_ROWS.map((key) => {
                  const d = site.domains[key];
                  const c = STATUS_COLOR[d.status];
                  const label = key === 'posture_index' ? 'Posture Index' : LAYER_MAP[key]?.label ?? key;
                  return (
                    <div key={key} className="flex items-center gap-1.5 py-0.5">
                      <span className="text-[8px] font-mono text-[var(--text-muted)] w-[110px] flex-shrink-0 truncate">{label}</span>
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${d.score}%`, backgroundColor: c, opacity: 0.85 }} />
                      </div>
                      <span className="text-[9px] font-mono font-bold w-7 text-right tabular-nums" style={{ color: c }}>{d.score}</span>
                      <span className="w-5 text-[8px] font-mono text-[var(--text-muted)] text-center">
                        {d.trend > 0 ? <TrendingUp className="w-2.5 h-2.5 inline text-[#00E676]" /> : d.trend < 0 ? <TrendingDown className="w-2.5 h-2.5 inline text-[#FF9500]" /> : <Minus className="w-2.5 h-2.5 inline text-[var(--text-muted)]" />}
                      </span>
                      <span className="text-[7px] font-mono px-1 py-0.5 rounded flex-shrink-0" style={{ color: c, background: `${c}18` }}>
                        {d.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* IT Assets */}
            <Section title="IT ASSET REGISTRY">
              <div className="grid grid-cols-4 gap-1.5">
                <Stat label="SERVERS"   value={site.domains.it_assets.servers.toLocaleString()}   color="#00E676" />
                <Stat label="ENDPOINTS" value={site.domains.it_assets.endpoints.toLocaleString()} color="#00BCD4" />
                <Stat label="NETWORK"   value={site.domains.it_assets.network.toLocaleString()}   color="#448AFF" />
                <Stat label="CLOUD"     value={site.domains.it_assets.cloud.toLocaleString()}     color="#D4AF37" />
              </div>
            </Section>

            {/* OT Assets */}
            <Section title="OT ASSET REGISTRY">
              <div className="grid grid-cols-3 gap-1.5">
                <Stat label="PLCs"        value={site.domains.ot_assets.plcs}  color="#FF9500" />
                <Stat label="HMIs"        value={site.domains.ot_assets.hmis}  color="#FF6B00" />
                <Stat label="SCADA NODES" value={site.domains.ot_assets.scada} color="#FF3D3D" />
              </div>
            </Section>

            {/* Retention */}
            <Section title="ACTIVITY RETENTION">
              <div className="grid grid-cols-3 gap-1.5">
                <Stat
                  label="COVERAGE"
                  value={`${site.domains.activity_retention.coverage_pct}%`}
                  color={STATUS_COLOR[site.domains.activity_retention.status]}
                />
                <Stat
                  label="DAYS / 180"
                  value={`${site.domains.activity_retention.days_retained}/180`}
                  color={STATUS_COLOR[site.domains.activity_retention.status]}
                />
                <Stat
                  label="STATUS"
                  value={site.domains.activity_retention.status}
                  color={STATUS_COLOR[site.domains.activity_retention.status]}
                />
              </div>
            </Section>

            {/* Recent Activity */}
            <Section title="RECENT ACTIVITY">
              <div className="space-y-0.5">
                {site.recentActivity.slice(0, 5).map((a, i) => (
                  <div key={i} className="flex items-start gap-2 py-1 border-b border-[var(--border-secondary)] last:border-0">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: SEV_COLOR[a.severity], boxShadow: `0 0 4px ${SEV_COLOR[a.severity]}80` }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-mono text-[var(--text-primary)] leading-snug">{a.title}</div>
                      <div className="text-[7px] font-mono text-[var(--text-muted)] mt-0.5">
                        {new Date(a.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {a.type.toUpperCase()}
                      </div>
                    </div>
                    <span className="text-[7px] font-mono flex-shrink-0 mt-0.5" style={{ color: SEV_COLOR[a.severity] }}>
                      {a.severity}
                    </span>
                  </div>
                ))}
              </div>
            </Section>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
