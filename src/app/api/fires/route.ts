// DEMO MOCK — returns fictional data.
// In production, replace this body with the real backend fetch; the response shape is unchanged.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const SITE_CLUSTERS = [
  { name: 'North Hub',      lat: 48.85,  lng:   2.35, count: 412, category: 'PLC/SCADA'     },
  { name: 'EMEA Node',      lat: 51.51,  lng:  -0.13, count: 318, category: 'ICS'            },
  { name: 'Central Hub',    lat: 40.71,  lng: -74.01, count: 527, category: 'PLC/SCADA'     },
  { name: 'West Coast Hub', lat: 37.77,  lng:-122.42, count: 289, category: 'HMI'            },
  { name: 'APAC Site 1',    lat: 35.68,  lng: 139.65, count: 374, category: 'RTU'            },
  { name: 'APAC Site 2',    lat: 22.32,  lng: 114.17, count: 261, category: 'PLC/SCADA'     },
  { name: 'APAC Site 3',    lat:  1.35,  lng: 103.82, count: 198, category: 'ICS'            },
  { name: 'India Hub 1',    lat: 19.08,  lng:  72.88, count: 445, category: 'RTU'            },
  { name: 'MEA Node',       lat: 24.45,  lng:  54.38, count: 312, category: 'HMI'            },
  { name: 'LATAM Node',     lat:-23.55,  lng: -46.63, count: 224, category: 'PLC/SCADA'     },
  { name: 'South Hub',      lat:-33.87,  lng: 151.21, count: 187, category: 'ICS'            },
  { name: 'India Plant 2',  lat: 22.61,  lng:  75.69, count: 450, category: 'PLC/SCADA'     },
  { name: 'India Node 3',   lat: 17.98,  lng:  74.43, count: 200, category: 'ICS'            },
  { name: 'India Plant 4',  lat: 22.80,  lng:  86.20, count: 550, category: 'PLC/SCADA'     },
  { name: 'India Hub 5',    lat: 19.88,  lng:  75.32, count: 310, category: 'HMI'            },
  { name: 'India Node 6',   lat: 20.52,  lng:  72.97, count: 145, category: 'RTU'            },
  { name: 'India Plant 7',  lat: 23.03,  lng:  72.58, count: 470, category: 'PLC/SCADA'     },
  { name: 'India Hub 8',    lat: 23.26,  lng:  77.41, count: 260, category: 'ICS'            },
  { name: 'India Node 9',   lat: 13.08,  lng:  80.27, count: 185, category: 'RTU'            },
  { name: 'India Plant 10', lat: 11.01,  lng:  76.97, count: 580, category: 'PLC/SCADA'     },
  { name: 'India Node 11',  lat: 22.97,  lng:  76.07, count: 305, category: 'HMI'            },
  { name: 'India Hub 12',   lat: 16.70,  lng:  74.24, count: 220, category: 'ICS'            },
  { name: 'India Plant 13', lat: 21.15,  lng:  79.08, count: 420, category: 'RTU'            },
  { name: 'India Node 14',  lat: 28.98,  lng:  79.40, count: 280, category: 'HMI'            },
  { name: 'India Hub 15',   lat: 18.52,  lng:  73.86, count: 200, category: 'ICS'            },
];

function jitter(base: number, spread: number) {
  return +(base + (Math.random() - 0.5) * spread).toFixed(4);
}

export async function GET() {
  await delay(500 + Math.random() * 300);
  try {
    const ot_assets: any[] = [];
    for (const site of SITE_CLUSTERS) {
      const dots = Math.min(site.count, 55);
      for (let i = 0; i < dots; i++) {
        const crit = Math.random();
        ot_assets.push({
          lat: jitter(site.lat, 0.4),
          lng: jitter(site.lng, 0.4),
          site: site.name,
          category: site.category,
          brightness: +(290 + crit * 60).toFixed(1),
          criticality: crit > 0.85 ? 'CRITICAL' : crit > 0.6 ? 'HIGH' : 'NORMAL',
        });
      }
    }
    const total = SITE_CLUSTERS.reduce((a, s) => a + s.count, 0);
    return NextResponse.json(
      { ot_assets, total, timestamp: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch {
    return NextResponse.json({ ot_assets: [] }, { status: 500 });
  }
}
