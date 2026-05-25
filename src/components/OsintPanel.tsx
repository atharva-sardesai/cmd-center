'use client';

import { motion } from 'framer-motion';
import { Lock, ChevronUp } from 'lucide-react';

interface OsintPanelProps { isOpen?: boolean; onClose?: () => void; isMobile?: boolean; onSweepVisualize?: (d: any) => void; onScanGeolocate?: (t: string, d: any) => void; }

export default function OsintPanel({ onClose }: OsintPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-panel pointer-events-auto flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-secondary)]/40">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="hud-text text-[12px] text-[var(--text-muted)]">RECON TOOLKIT</span>
          <span
            className="text-[8px] font-mono px-1.5 py-0.5 rounded border"
            style={{ color: '#FFD700', borderColor: '#FFD70040', background: '#FFD70010' }}
          >
            COMING SOON
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <ChevronUp className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col items-center justify-center px-6 py-10 gap-4 text-center">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center border"
          style={{ borderColor: 'var(--border-secondary)', background: 'var(--bg-tertiary)' }}
        >
          <Lock className="w-5 h-5 text-[var(--text-muted)]" />
        </div>
        <div>
          <p className="text-[13px] font-mono text-[var(--text-secondary)] mb-1">
            RECON Toolkit — coming soon
          </p>
          <p className="text-[11px] font-mono text-[var(--text-muted)] leading-relaxed max-w-[260px]">
            Port scanning, DNS lookup, WHOIS, certificate transparency, and threat intelligence
            tools are disabled in demo mode. Connect the RECON scanner backend to enable.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
