// DEMO MOCK — returns fictional data.
// In production, replace this body with the real backend fetch; the response shape is unchanged.

import { NextResponse } from 'next/server';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const ARCH_SITES = [
  { name: 'North Hub',      lat: 48.85,  lng:   2.35, type: 'Cloud Platform',      status: 'Completed',   score: 4.2 },
  { name: 'EMEA Node',      lat: 51.51,  lng:  -0.13, type: 'Identity Provider',   status: 'Completed',   score: 3.8 },
  { name: 'Central Hub',    lat: 40.71,  lng: -74.01, type: 'Data Warehouse',      status: 'In Progress', score: 3.1 },
  { name: 'West Coast Hub', lat: 37.77,  lng:-122.42, type: 'API Gateway',         status: 'Completed',   score: 4.5 },
  { name: 'APAC Site 1',    lat: 35.68,  lng: 139.65, type: 'OT Network Segment',  status: 'Scheduled',   score: 2.7 },
  { name: 'APAC Site 2',    lat: 22.32,  lng: 114.17, type: 'ERP Integration',     status: 'Completed',   score: 3.5 },
  { name: 'APAC Site 3',    lat:  1.35,  lng: 103.82, type: 'Zero-Trust Pilot',    status: 'In Progress', score: 4.0 },
  { name: 'India Hub 1',    lat: 19.08,  lng:  72.88, type: 'Service Mesh',        status: 'Completed',   score: 3.3 },
  { name: 'LATAM Node',     lat:-23.55,  lng: -46.63, type: 'Edge Deployment',     status: 'Scheduled',   score: 2.4 },
  { name: 'Nordic Site',    lat: 59.91,  lng:  10.75, type: 'SIEM Architecture',   status: 'Completed',   score: 4.7 },
  { name: 'MEA Node',       lat: 24.45,  lng:  54.38, type: 'Secure Remote Access',status: 'In Progress', score: 3.6 },
  { name: 'South Hub',      lat:-33.87,  lng: 151.21, type: 'Cloud WAF',           status: 'Completed',   score: 4.1 },
  { name: 'Southeast Hub',  lat: 33.75,  lng: -84.39, type: 'Backup & Recovery',   status: 'Completed',   score: 3.9 },
  { name: 'Midwest Node',   lat: 41.88,  lng: -87.63, type: 'Dev/Sec Pipeline',    status: 'Scheduled',   score: 2.2 },
];

export async function GET() {
  await delay(400 + Math.random() * 300);
  try {
    const arch_sites = ARCH_SITES.map(s => ({
      ...s,
      lat: s.lat, lng: s.lng,
      magnitude: s.score,
      place: `${s.name} — ${s.type}`,
      depth: 0,
      time: Date.now() - Math.floor(Math.random() * 30 * 86400000),
    }));
    return NextResponse.json(
      { arch_sites, total: arch_sites.length, timestamp: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch {
    return NextResponse.json({ arch_sites: [] }, { status: 500 });
  }
}
