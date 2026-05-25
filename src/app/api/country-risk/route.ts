// DEMO MOCK — returns fictional data.
// In production, replace this body with the real backend fetch; the response shape is unchanged.

import { NextResponse } from 'next/server';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Per-domain posture subscores (0–100, higher = better)
const DOMAIN_SCORES = [
  { key: 'exposure',          label: 'Exposure Findings',    score: 68, trend: -2, status: 'WATCH'   },
  { key: 'app_assurance',     label: 'App Assurance',        score: 72, trend: +4, status: 'WATCH'   },
  { key: 'awareness',         label: 'Awareness Reach',      score: 91, trend: +3, status: 'HEALTHY' },
  { key: 'dlp',               label: 'Data Loss Prevention', score: 79, trend: -1, status: 'WATCH'   },
  { key: 'arch_reviews',      label: 'Architecture Reviews', score: 84, trend: +6, status: 'HEALTHY' },
  { key: 'ot_assets',         label: 'OT Asset Registry',    score: 61, trend: -5, status: 'CRITICAL'},
  { key: 'it_assets',         label: 'IT Asset Registry',    score: 83, trend: +2, status: 'HEALTHY' },
  { key: 'sim_campaigns',     label: 'Sim Campaigns',        score: 74, trend: +1, status: 'WATCH'   },
  { key: 'app_governance',    label: 'App Governance',       score: 65, trend: -3, status: 'WATCH'   },
  { key: 'access_recert',     label: 'Access Recertification',score: 70, trend: -2, status: 'WATCH'  },
  { key: 'activity_retention',label: 'Activity Retention',   score: 88, trend: +1, status: 'HEALTHY' },
];

const POSTURE_SCORE = Math.round(DOMAIN_SCORES.reduce((a, d) => a + d.score, 0) / DOMAIN_SCORES.length);

// exchanges field kept for GlobalStatusBar backward compat (now shows domain status)
const DOMAIN_AS_EXCHANGES = DOMAIN_SCORES.map(d => ({
  name: d.label,
  country: d.key,
  open: d.status === 'HEALTHY',
}));

// countries field repurposed for per-domain risk display
const DOMAIN_AS_COUNTRIES = DOMAIN_SCORES.map(d => ({
  code: d.key.slice(0, 3).toUpperCase(),
  risk_score: 100 - d.score,
  risk_level: d.status === 'HEALTHY' ? 'LOW' : d.status === 'WATCH' ? 'ELEVATED' : 'CRITICAL',
  label: d.label,
  tags: [d.trend > 0 ? `↑${d.trend}` : `↓${Math.abs(d.trend)}`],
}));

export async function GET() {
  await delay(300 + Math.random() * 200);
  try {
    return NextResponse.json(
      {
        posture_score: POSTURE_SCORE,
        domains: DOMAIN_SCORES,
        exchanges: DOMAIN_AS_EXCHANGES,
        countries: DOMAIN_AS_COUNTRIES,
        open_exchanges: DOMAIN_SCORES.filter(d => d.status === 'HEALTHY').length,
        timestamp: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch {
    return NextResponse.json({ posture_score: 0, domains: [], exchanges: [], countries: [] }, { status: 500 });
  }
}
