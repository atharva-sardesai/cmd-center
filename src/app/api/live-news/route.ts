// DEMO MOCK — returns fictional data.
// In production, replace this body with the real backend fetch; the response shape is unchanged.

import { NextResponse } from 'next/server';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Activity Retention coverage by site
const RETENTION_SITES = [
  { name: 'North Hub',      lat: 48.85, lng:   2.35, coverage_pct: 99, days_retained: 180, status: 'Compliant',     city: 'EMEA HQ',         country: 'EMEA', url: null, category: 'retention', embed_allowed: false },
  { name: 'EMEA Node',      lat: 51.51, lng:  -0.13, coverage_pct: 97, days_retained: 180, status: 'Compliant',     city: 'EMEA Secondary',  country: 'EMEA', url: null, category: 'retention', embed_allowed: false },
  { name: 'Nordic Site',    lat: 59.91, lng:  10.75, coverage_pct: 94, days_retained: 180, status: 'Compliant',     city: 'Nordic Office',   country: 'EMEA', url: null, category: 'retention', embed_allowed: false },
  { name: 'Central Hub',    lat: 40.71, lng: -74.01, coverage_pct: 98, days_retained: 180, status: 'Compliant',     city: 'AMER HQ',         country: 'AMER', url: null, category: 'retention', embed_allowed: false },
  { name: 'West Coast Hub', lat: 37.77, lng:-122.42, coverage_pct: 96, days_retained: 180, status: 'Compliant',     city: 'West Coast',      country: 'AMER', url: null, category: 'retention', embed_allowed: false },
  { name: 'Midwest Node',   lat: 41.88, lng: -87.63, coverage_pct: 88, days_retained: 162, status: 'Gap Detected',  city: 'Midwest',         country: 'AMER', url: null, category: 'retention', embed_allowed: false },
  { name: 'Southeast Hub',  lat: 33.75, lng: -84.39, coverage_pct: 91, days_retained: 170, status: 'Compliant',     city: 'Southeast',       country: 'AMER', url: null, category: 'retention', embed_allowed: false },
  { name: 'LATAM Node',     lat:-23.55, lng: -46.63, coverage_pct: 79, days_retained: 143, status: 'Gap Detected',  city: 'LATAM HQ',        country: 'LATAM',url: null, category: 'retention', embed_allowed: false },
  { name: 'APAC Site 1',    lat: 35.68, lng: 139.65, coverage_pct: 95, days_retained: 180, status: 'Compliant',     city: 'APAC Primary',    country: 'APAC', url: null, category: 'retention', embed_allowed: false },
  { name: 'APAC Site 2',    lat: 22.32, lng: 114.17, coverage_pct: 93, days_retained: 180, status: 'Compliant',     city: 'APAC Secondary',  country: 'APAC', url: null, category: 'retention', embed_allowed: false },
  { name: 'APAC Site 3',    lat:  1.35, lng: 103.82, coverage_pct: 90, days_retained: 172, status: 'Compliant',     city: 'APAC Tertiary',   country: 'APAC', url: null, category: 'retention', embed_allowed: false },
  { name: 'India Site',     lat: 19.08, lng:  72.88, coverage_pct: 85, days_retained: 155, status: 'Gap Detected',  city: 'India Office',    country: 'APAC', url: null, category: 'retention', embed_allowed: false },
  { name: 'South Hub',      lat:-33.87, lng: 151.21, coverage_pct: 92, days_retained: 175, status: 'Compliant',     city: 'APAC South',      country: 'APAC', url: null, category: 'retention', embed_allowed: false },
  { name: 'MEA Node',       lat: 24.45, lng:  54.38, coverage_pct: 72, days_retained: 130, status: 'Non-Compliant', city: 'MEA Office',      country: 'MEA',  url: null, category: 'retention', embed_allowed: false },
];

export async function GET() {
  await delay(300 + Math.random() * 250);
  try {
    return NextResponse.json(
      { feeds: RETENTION_SITES, retention_sites: RETENTION_SITES, total: RETENTION_SITES.length, timestamp: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch {
    return NextResponse.json({ feeds: [], retention_sites: [] }, { status: 500 });
  }
}
