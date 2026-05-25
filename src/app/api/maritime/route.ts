// DEMO MOCK — returns fictional data.
// In production, replace this body with the real backend fetch; the response shape is unchanged.

import { NextResponse } from 'next/server';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// DLP enforcement points (replaces maritime ports)
const DLP_SITES = [
  { name: 'North Hub — Email Gateway',    lat: 48.85, lng:   2.35, type: 'email',    country: 'EMEA',  policies: 142 },
  { name: 'EMEA Node — Cloud Storage',    lat: 51.51, lng:  -0.13, type: 'cloud',    country: 'EMEA',  policies:  98 },
  { name: 'Nordic Site — Endpoint DLP',   lat: 59.91, lng:  10.75, type: 'endpoint', country: 'EMEA',  policies:  67 },
  { name: 'Central Hub — Email Gateway',  lat: 40.71, lng: -74.01, type: 'email',    country: 'AMER',  policies: 189 },
  { name: 'West Coast Hub — API Proxy',   lat: 37.77, lng:-122.42, type: 'api',      country: 'AMER',  policies: 114 },
  { name: 'Midwest Node — Endpoint DLP',  lat: 41.88, lng: -87.63, type: 'endpoint', country: 'AMER',  policies:  73 },
  { name: 'LATAM Node — Email Gateway',   lat:-23.55, lng: -46.63, type: 'email',    country: 'LATAM', policies:  55 },
  { name: 'APAC Site 1 — Cloud Storage',  lat: 35.68, lng: 139.65, type: 'cloud',    country: 'APAC',  policies:  88 },
  { name: 'APAC Site 2 — API Proxy',      lat: 22.32, lng: 114.17, type: 'api',      country: 'APAC',  policies:  61 },
  { name: 'APAC Site 3 — Endpoint DLP',   lat:  1.35, lng: 103.82, type: 'endpoint', country: 'APAC',  policies:  49 },
  { name: 'India Site — Email Gateway',   lat: 19.08, lng:  72.88, type: 'email',    country: 'APAC',  policies:  92 },
  { name: 'South Hub — Cloud Storage',    lat:-33.87, lng: 151.21, type: 'cloud',    country: 'APAC',  policies:  44 },
  { name: 'MEA Node — API Proxy',         lat: 24.45, lng:  54.38, type: 'api',      country: 'MEA',   policies:  38 },
];

// Active DLP incidents (replaces live ships)
const DLP_EVENTS = [
  { name: 'BLOCKED-7821', lat: 48.91, lng:  2.44, type: 'blocked', severity: 'HIGH',     data_type: 'PII'           },
  { name: 'BLOCKED-7822', lat: 51.55, lng: -0.10, type: 'blocked', severity: 'CRITICAL',  data_type: 'Financial'     },
  { name: 'ALERTED-4410', lat: 40.68, lng:-73.99, type: 'alerted', severity: 'MEDIUM',    data_type: 'IP'            },
  { name: 'BLOCKED-7823', lat: 37.80, lng:-122.40,type: 'blocked', severity: 'HIGH',     data_type: 'Source Code'   },
  { name: 'ALERTED-4411', lat: 35.70, lng: 139.70,type: 'alerted', severity: 'LOW',      data_type: 'HR Data'       },
  { name: 'BLOCKED-7824', lat: 22.35, lng: 114.20,type: 'blocked', severity: 'CRITICAL',  data_type: 'Customer Data' },
  { name: 'ALERTED-4412', lat:  1.38, lng: 103.85,type: 'alerted', severity: 'MEDIUM',    data_type: 'PII'           },
  { name: 'BLOCKED-7825', lat: 19.10, lng:  72.90,type: 'blocked', severity: 'HIGH',     data_type: 'Financial'     },
  { name: 'ALERTED-4413', lat:-23.58, lng: -46.60,type: 'alerted', severity: 'LOW',      data_type: 'Email'         },
  { name: 'BLOCKED-7826', lat: 24.48, lng:  54.40,type: 'blocked', severity: 'HIGH',     data_type: 'PII'           },
];

// High-risk data flow chokepoints (replaces maritime chokepoints)
const DLP_CHOKEPOINTS = [
  { name: 'EMEA → APAC Data Corridor', lat: 25.0, lng:  68.0, traffic: '4.2 TB/day', risk: 'HIGH'     },
  { name: 'AMER → EMEA Backbone',      lat: 45.0, lng: -30.0, traffic: '6.8 TB/day', risk: 'ELEVATED' },
  { name: 'Cloud Sync Trunk',           lat:  5.0, lng:  80.0, traffic: '11 TB/day',  risk: 'CRITICAL' },
  { name: 'LATAM → AMER Link',          lat:  5.0, lng: -70.0, traffic: '1.9 TB/day', risk: 'MODERATE' },
  { name: 'MEA Aggregation Point',      lat: 20.0, lng:  45.0, traffic: '2.1 TB/day', risk: 'HIGH'     },
];

export async function GET() {
  await delay(400 + Math.random() * 300);
  try {
    return NextResponse.json(
      {
        ports: DLP_SITES,
        ships: DLP_EVENTS,
        chokepoints: DLP_CHOKEPOINTS,
        dlp_sites: DLP_SITES,
        dlp_events: DLP_EVENTS,
        dlp_chokepoints: DLP_CHOKEPOINTS,
        total_sites: DLP_SITES.length,
        total_incidents: DLP_EVENTS.length,
        timestamp: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch {
    return NextResponse.json({ ports: [], ships: [], chokepoints: [], dlp_sites: [], dlp_events: [], dlp_chokepoints: [] }, { status: 500 });
  }
}
