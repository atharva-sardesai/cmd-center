// DEMO MOCK — returns fictional data.
// In production, replace this body with the real backend fetch; the response shape is unchanged.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Access Recertification events — overdue or high-risk entitlements
const ACCESS_EVENTS = [
  { lat: 40.71, lng: -74.01, name: 'Central Hub — 48 overdue certifications',   severity: 'high',     overdue: 48, dept: 'Finance'    },
  { lat: 48.85, lng:   2.35, name: 'North Hub — 31 high-risk entitlements',      severity: 'elevated', overdue: 31, dept: 'IT Ops'     },
  { lat: 51.51, lng:  -0.13, name: 'EMEA Node — 22 orphaned accounts',           severity: 'high',     overdue: 22, dept: 'HR'         },
  { lat: 37.77, lng:-122.42, name: 'West Coast Hub — 14 admin over-provisions',  severity: 'critical', overdue: 14, dept: 'Engineering' },
  { lat: 35.68, lng: 139.65, name: 'APAC Site 1 — 37 dormant privileged IDs',   severity: 'elevated', overdue: 37, dept: 'Operations' },
  { lat: 22.32, lng: 114.17, name: 'APAC Site 2 — 19 contractor role conflicts', severity: 'high',     overdue: 19, dept: 'Procurement' },
  { lat:  1.35, lng: 103.82, name: 'APAC Site 3 — 8 SoD violations',            severity: 'critical', overdue:  8, dept: 'Finance'    },
  { lat: 19.08, lng:  72.88, name: 'India Hub 1 — 41 expired access grants',     severity: 'elevated', overdue: 41, dept: 'HR'         },
  { lat:-23.55, lng: -46.63, name: 'LATAM Node — 27 recertification overdue',    severity: 'high',     overdue: 27, dept: 'IT Ops'     },
  { lat: 24.45, lng:  54.38, name: 'MEA Node — 11 privileged account drift',     severity: 'elevated', overdue: 11, dept: 'Engineering' },
  { lat: 59.91, lng:  10.75, name: 'Nordic Site — 5 admin role conflicts',       severity: 'critical', overdue:  5, dept: 'IT Ops'     },
  { lat:-33.87, lng: 151.21, name: 'South Hub — 18 dormant service accounts',    severity: 'high',     overdue: 18, dept: 'Operations' },
  { lat: 41.88, lng: -87.63, name: 'Midwest Node — 33 cert cycles overdue',      severity: 'elevated', overdue: 33, dept: 'Finance'    },
  { lat: 33.75, lng: -84.39, name: 'Southeast Hub — 9 PAM policy exceptions',   severity: 'critical', overdue:  9, dept: 'Security'   },
];

export async function GET() {
  await delay(350 + Math.random() * 300);
  try {
    const access_events = ACCESS_EVENTS;
    return NextResponse.json(
      { access_events, total: access_events.reduce((a, e) => a + e.overdue, 0), timestamp: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch {
    return NextResponse.json({ access_events: [] }, { status: 500 });
  }
}
