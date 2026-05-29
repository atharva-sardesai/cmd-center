'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

interface DomainStatus { key: string; label: string; score: number; trend: number; status: string; }

export default function GlobalStatusBar() {
  const [domains, setDomains] = useState<DomainStatus[]>([]);
  const [postureScore, setPostureScore] = useState<number | null>(null);
  const [assurance, setAssurance] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [riskRes, assurRes] = await Promise.allSettled([
          fetch('/api/country-risk'),
          fetch('/api/cyber-threats'),
        ]);
        if (riskRes.status === 'fulfilled' && riskRes.value.ok) {
          const d = await riskRes.value.json();
          setDomains(d.domains || []);
          setPostureScore(d.posture_score ?? null);
          setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) + 'Z');
        }
        if (assurRes.status === 'fulfilled' && assurRes.value.ok) {
          setAssurance(await assurRes.value.json());
        }
      } catch { /* suppress */ }
    };
    fetchData();
    const iv = setInterval(fetchData, 1800000);
    return () => clearInterval(iv);
  }, []);

  if (!domains.length && postureScore === null) return null;

  const statusColor = (s: string) =>
    s === 'CRITICAL' ? '#EF4444' : s === 'WATCH' ? '#F59E0B' : '#10B981';

  const openFindings = assurance?.stats?.active_cves ?? 0;

  const tickerContent = (
    <>
      {/* Posture Index */}
      <span className="inline-flex items-center gap-1.5 mx-3">
        <Shield className="w-2.5 h-2.5 text-[var(--cyan-primary)]" />
        <span className="text-[var(--text-muted)]">POSTURE INDEX</span>
        <span
          className="font-bold tabular-nums"
          style={{ color: (postureScore ?? 0) >= 80 ? '#10B981' : (postureScore ?? 0) >= 65 ? '#F59E0B' : '#EF4444' }}
        >
          {postureScore ?? '—'}/100
        </span>
      </span>

      <span className="text-[var(--border-primary)] mx-1">|</span>

      {/* Domain scores */}
      {domains.map(d => (
        <span key={d.key} className="inline-flex items-center gap-0.5 mx-2">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: statusColor(d.status) }}
          />
          <span className="text-[var(--text-muted)]">{d.label.split(' ')[0]}</span>
          <span className="font-bold tabular-nums" style={{ color: statusColor(d.status) }}>
            {d.score}
          </span>
          <span className="text-[8px]" style={{ color: d.trend >= 0 ? '#10B981' : '#EF4444' }}>
            {d.trend >= 0 ? `↑${d.trend}` : `↓${Math.abs(d.trend)}`}
          </span>
        </span>
      ))}

      <span className="text-[var(--border-primary)] mx-1">|</span>

      {/* Open findings */}
      <span className="inline-flex items-center gap-1 mx-2">
        <span className="text-[var(--cyan-primary)]">OPEN FINDINGS</span>
        <span className="text-[var(--text-primary)] font-bold">{openFindings}</span>
      </span>

      {lastUpdated && (
        <>
          <span className="text-[var(--border-primary)] mx-1">|</span>
          <span className="text-[var(--text-muted)] mx-2">UPDATED {lastUpdated}</span>
        </>
      )}
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 4, duration: 0.8 }}
      className="hidden md:block absolute bottom-0 left-0 right-0 z-[198] pointer-events-none"
    >
      <div className="h-[22px] overflow-hidden bg-[var(--bg-panel)]/80 border-t border-[var(--border-secondary)]/50 flex items-center text-[8px] font-mono tracking-wider backdrop-blur-sm">
        {/* Static label */}
        <div className="flex-shrink-0 px-2 h-full flex items-center gap-1 border-r border-[var(--border-secondary)]/50 bg-[var(--bg-panel)] pointer-events-auto">
          <Shield className="w-2.5 h-2.5 text-[var(--cyan-primary)]" />
          <span
            className="font-bold tabular-nums"
            style={{ color: (postureScore ?? 0) >= 80 ? '#10B981' : (postureScore ?? 0) >= 65 ? '#F59E0B' : '#EF4444' }}
          >
            {postureScore ?? '—'}
          </span>
        </div>
        {/* Scrolling ticker */}
        <div className="flex-1 overflow-hidden relative">
          <div className="flex items-center animate-ticker whitespace-nowrap">
            {tickerContent}
            {tickerContent}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
