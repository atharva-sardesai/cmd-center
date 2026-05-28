'use client';

import { motion } from 'framer-motion';
import { Globe, MapPin } from 'lucide-react';

interface ViewPresetsProps {
  onNavigate: (lat: number, lng: number, zoom: number) => void;
}

const PRESETS = [
  { label: 'GLOBAL', lat: 20, lng: 0, zoom: 2.5 },
  { label: 'EMEA', lat: 49, lng: 8, zoom: 4 },
  { label: 'AMER', lat: 38, lng: -96, zoom: 3.5 },
  { label: 'LATAM', lat: -15, lng: -60, zoom: 3.8 },
  { label: 'APAC', lat: 15, lng: 105, zoom: 3.8 },
  { label: 'MEA', lat: 20, lng: 45, zoom: 4 },
  { label: 'INDIA HUBS', lat: 22, lng: 78, zoom: 4.5 },
  { label: 'SITE CLUSTERS', lat: 18, lng: 74, zoom: 5.2 },
];

export default function ViewPresets({ onNavigate }: ViewPresetsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.7, duration: 0.6 }}
      className="glass-panel p-2.5 pointer-events-auto"
    >
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
        <span className="hud-text text-[12px] text-[var(--text-primary)] tracking-widest">REGION PRESETS</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => onNavigate(p.lat, p.lng, p.zoom)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-mono tracking-wider border border-transparent text-[var(--text-muted)] hover:bg-[var(--hover-accent)] hover:border-[var(--border-primary)] hover:text-[var(--gold-primary)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span>{p.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
