'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MASTER_SITES } from '@/data/sites';

interface DomainStatus { key: string; label: string; score: number; trend: number; status: string; }

type RiskPayload = {
  posture_score?: number;
  domains?: DomainStatus[];
  timestamp?: string;
};

const DOMAIN_KEYS = [
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
] as const;

function hasCriticalStatus(site: (typeof MASTER_SITES)[number]) {
  return DOMAIN_KEYS.some(key => site.domains[key].status === 'CRITICAL');
}

function countCriticalDomains() {
  return MASTER_SITES.reduce(
    (total, site) => total + DOMAIN_KEYS.filter(key => site.domains[key].status === 'CRITICAL').length,
    0
  );
}

function formatRefresh(timestamp?: string) {
  const source = timestamp ? new Date(timestamp) : new Date();
  return source.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) + 'Z';
}

export default function GlobalStatusBar() {
  const [postureScore, setPostureScore] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const riskRes = await fetch('/api/country-risk');
        if (riskRes.ok) {
          const payload = await riskRes.json() as RiskPayload;
          setPostureScore(payload.posture_score ?? null);
          setLastUpdated(formatRefresh(payload.timestamp));
        }
      } catch { /* keep the last known metric values */ }
    };
    fetchData();
    const iv = setInterval(fetchData, 1800000);
    return () => clearInterval(iv);
  }, []);

  const metrics = [
    { label: 'OPEN CRITICALS', value: countCriticalDomains().toLocaleString() },
    { label: 'SITES AT RISK', value: MASTER_SITES.filter(hasCriticalStatus).length.toLocaleString() },
    { label: 'POSTURE INDEX', value: `${postureScore ?? '—'}/100` },
    { label: 'LAST REFRESH', value: lastUpdated || '—' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 3, duration: 0.5 }}
      className="hidden md:flex absolute bottom-0 left-0 right-0 z-[198] h-10 pointer-events-none items-center justify-center glass-panel glass-panel-left rounded-none border-x-0 border-b-0"
    >
      <div className="flex items-center justify-center gap-6">
        {metrics.map(metric => (
          <div key={metric.label} className="flex items-baseline gap-2">
            <span className="text-[12px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
              {metric.label}
            </span>
            <span className="font-mono text-[14px] font-normal tabular-nums text-[var(--text-primary)]">
              {metric.value}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
