// DEMO MOCK — returns fictional data.
// In production, replace this body with the real backend fetch; the response shape is unchanged.

import { NextResponse } from 'next/server';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const now = new Date();
function ago(minutes: number) { return new Date(now.getTime() - minutes * 60000).toISOString(); }

// Fictional security awareness activity feed items
const AWARENESS_ITEMS = [
  { title: 'Exposure Findings: 3 new criticals — North Hub. Remediation ticket raised.',        source: 'Exposure Findings',   risk_score: 9, published: ago(12),  coords: [48.85,   2.35] },
  { title: 'App Assurance: MES Interface audit complete — 67 findings, CRITICAL severity.',     source: 'App Assurance',       risk_score: 9, published: ago(28),  coords: [48.20,  16.37] },
  { title: 'Simulated Campaigns: USB drop at APAC Site 2 — 18% insert rate, above threshold.', source: 'Sim Campaigns',       risk_score: 8, published: ago(45),  coords: [22.32, 114.17] },
  { title: 'Access Recert: West Coast Hub — 14 admin over-provisions flagged for review.',      source: 'Access Recertification', risk_score: 8, published: ago(60), coords: [37.77,-122.42] },
  { title: 'DLP: CRITICAL block — Financial data exfil attempt via email, EMEA Node.',         source: 'DLP',                 risk_score: 9, published: ago(72),  coords: [51.51,  -0.13] },
  { title: 'Awareness Reach: Q2 phishing module — 94% completion across EMEA sites.',          source: 'Awareness Reach',     risk_score: 3, published: ago(90),  coords: [51.51,  -0.13] },
  { title: 'IT Assets: 320 unpatched endpoints discovered — Central Hub, patch window open.',  source: 'IT Asset Registry',   risk_score: 7, published: ago(110), coords: [40.71, -74.01] },
  { title: 'App Governance: SCADA Viewer — 52 policy violations, review mandatory this sprint.',source: 'App Governance',     risk_score: 8, published: ago(130), coords: [19.08,  72.88] },
  { title: 'Architecture Reviews: Zero-Trust Pilot at APAC Site 3 — review completed, 4.0/5.0.',source: 'Architecture Reviews',risk_score: 4, published: ago(150), coords: [ 1.35, 103.82] },
  { title: 'OT Assets: 87 new RTU devices enrolled — India Hub 1. Category: RTU.',             source: 'OT Asset Registry',   risk_score: 4, published: ago(170), coords: [19.08,  72.88] },
  { title: 'Activity Retention: MEA Node below SLA — 72% coverage, 130 days. Escalated.',     source: 'Activity Retention',  risk_score: 7, published: ago(200), coords: [24.45,  54.38] },
  { title: 'Exposure Findings: 8 high-severity findings resolved — APAC Site 2.',              source: 'Exposure Findings',   risk_score: 5, published: ago(240), coords: [22.32, 114.17] },
  { title: 'Simulated Campaigns: Q2 mass phish complete — LATAM Node, 3.4% click rate.',       source: 'Sim Campaigns',       risk_score: 4, published: ago(290), coords:[-23.55, -46.63] },
  { title: 'DLP: High-risk data flow detected — Cloud Sync Trunk, 11 TB/day reviewed.',        source: 'DLP',                 risk_score: 7, published: ago(350), coords: [ 5.0,   80.0]  },
  { title: 'Access Recert: India Hub 1 — 41 expired access grants removed. Cert cycle closed.',source: 'Access Recertification', risk_score: 5, published: ago(400), coords: [19.08, 72.88] },
  { title: 'App Assurance: Supply Chain Portal pen test — 27 HIGH findings, 4 require patching.',source: 'App Assurance',     risk_score: 7, published: ago(460), coords: [24.45,  54.38] },
  { title: 'Awareness Reach: Nordic Site — 100% module completion, zero repeat clickers.',     source: 'Awareness Reach',     risk_score: 2, published: ago(520), coords: [59.91,  10.75] },
  { title: 'Architecture Reviews: SIEM Architecture review at Nordic Site — 4.7/5.0 score.',   source: 'Architecture Reviews',risk_score: 3, published: ago(600), coords: [59.91,  10.75] },
  { title: 'IT Assets: Cloud inventory sync complete — 870 workloads catalogued, Central Hub.', source: 'IT Asset Registry',  risk_score: 3, published: ago(700), coords: [40.71, -74.01] },
  { title: 'OT Assets: 2 CRITICAL PLCs identified without network segmentation — North Hub.',  source: 'OT Asset Registry',   risk_score: 8, published: ago(800), coords: [48.85,   2.35] },
];

export async function GET() {
  await delay(400 + Math.random() * 300);
  try {
    return NextResponse.json(
      { news: AWARENESS_ITEMS, total: AWARENESS_ITEMS.length, timestamp: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch {
    return NextResponse.json({ news: [] }, { status: 500 });
  }
}
