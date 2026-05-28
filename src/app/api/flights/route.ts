// DEMO MOCK — returns fictional data.
// In production, replace this body with the real backend fetch; the response shape is unchanged.

import { NextResponse } from 'next/server';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Fictional enterprise sites (lat/lng are generic geographic centroids, not real facilities)
const SITES = [
  { name: 'North Hub',           lat: 48.85,  lng:   2.35,  region: 'EMEA'   },
  { name: 'EMEA Node',           lat: 51.51,  lng:  -0.13,  region: 'EMEA'   },
  { name: 'Nordic Site',         lat: 59.91,  lng:  10.75,  region: 'EMEA'   },
  { name: 'Central Hub',         lat: 40.71,  lng: -74.01,  region: 'AMER'   },
  { name: 'West Coast Hub',      lat: 37.77,  lng:-122.42,  region: 'AMER'   },
  { name: 'Midwest Node',        lat: 41.88,  lng: -87.63,  region: 'AMER'   },
  { name: 'Southeast Hub',       lat: 33.75,  lng: -84.39,  region: 'AMER'   },
  { name: 'LATAM Node',          lat:-23.55,  lng: -46.63,  region: 'LATAM'  },
  { name: 'APAC Site 1',         lat: 35.68,  lng: 139.65,  region: 'APAC'   },
  { name: 'APAC Site 2',         lat: 22.32,  lng: 114.17,  region: 'APAC'   },
  { name: 'APAC Site 3',         lat:  1.35,  lng: 103.82,  region: 'APAC'   },
  { name: 'India Hub 1',         lat: 19.08,  lng:  72.88,  region: 'APAC'   },
  { name: 'South Hub',           lat:-33.87,  lng: 151.21,  region: 'APAC'   },
  { name: 'MEA Node',            lat: 24.45,  lng:  54.38,  region: 'MEA'    },
  { name: 'India Plant 2',       lat: 22.61,  lng:  75.69,  region: 'APAC'   },
  { name: 'India Node 3',        lat: 17.98,  lng:  74.43,  region: 'APAC'   },
  { name: 'India Plant 4',       lat: 22.80,  lng:  86.20,  region: 'APAC'   },
  { name: 'India Hub 5',         lat: 19.88,  lng:  75.32,  region: 'APAC'   },
  { name: 'India Node 6',        lat: 20.52,  lng:  72.97,  region: 'APAC'   },
  { name: 'India Plant 7',       lat: 23.03,  lng:  72.58,  region: 'APAC'   },
  { name: 'India Hub 8',         lat: 23.26,  lng:  77.41,  region: 'APAC'   },
  { name: 'India Node 9',        lat: 13.08,  lng:  80.27,  region: 'APAC'   },
  { name: 'India Plant 10',      lat: 11.01,  lng:  76.97,  region: 'APAC'   },
  { name: 'India Node 11',       lat: 22.97,  lng:  76.07,  region: 'APAC'   },
  { name: 'India Hub 12',        lat: 16.70,  lng:  74.24,  region: 'APAC'   },
  { name: 'India Plant 13',      lat: 21.15,  lng:  79.08,  region: 'APAC'   },
  { name: 'India Node 14',       lat: 28.98,  lng:  79.40,  region: 'APAC'   },
  { name: 'India Hub 15',        lat: 18.52,  lng:  73.86,  region: 'APAC'   },
];

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

function makeSites() {
  return SITES.map((s, i) => {
    const findings  = 10 + Math.floor(Math.sin(i * 1.3) * 80 + 120);
    const criticals = Math.floor(findings * (0.05 + (i % 4) * 0.03));
    const sev: Severity = criticals > 10 ? 'CRITICAL' : criticals > 5 ? 'HIGH' : criticals > 2 ? 'MEDIUM' : 'LOW';
    return { ...s, findings, criticals, severity: sev, score: Math.round(findings / 3) };
  });
}

export async function GET() {
  await delay(300 + Math.random() * 200);
  try {
    const exposure_sites = makeSites();
    return NextResponse.json(
      { exposure_sites, total: exposure_sites.reduce((a, s) => a + s.findings, 0), timestamp: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch {
    return NextResponse.json({ exposure_sites: [], total: 0 }, { status: 500 });
  }
}
