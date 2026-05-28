// DEMO MOCK — returns fictional data.
// In production, replace this body with the real backend fetch; the response shape is unchanged.

import { NextResponse } from 'next/server';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// IT Asset registry — servers, endpoints, network devices per site
const IT_SITES = [
  { name: 'North Hub',      lat: 48.85, lng:   2.35, servers: 312, endpoints: 1840, network: 94,  cloud: 580  },
  { name: 'EMEA Node',      lat: 51.51, lng:  -0.13, servers: 274, endpoints: 1520, network: 78,  cloud: 420  },
  { name: 'Nordic Site',    lat: 59.91, lng:  10.75, servers:  98, endpoints:  640, network: 32,  cloud: 180  },
  { name: 'Central Hub',    lat: 40.71, lng: -74.01, servers: 421, endpoints: 2340, network: 118, cloud: 870  },
  { name: 'West Coast Hub', lat: 37.77, lng:-122.42, servers: 387, endpoints: 2010, network: 104, cloud: 760  },
  { name: 'Midwest Node',   lat: 41.88, lng: -87.63, servers: 145, endpoints:  890, network: 47,  cloud: 230  },
  { name: 'Southeast Hub',  lat: 33.75, lng: -84.39, servers: 201, endpoints: 1100, network: 58,  cloud: 310  },
  { name: 'LATAM Node',     lat:-23.55, lng: -46.63, servers: 112, endpoints:  740, network: 39,  cloud: 190  },
  { name: 'APAC Site 1',    lat: 35.68, lng: 139.65, servers: 298, endpoints: 1680, network: 86,  cloud: 490  },
  { name: 'APAC Site 2',    lat: 22.32, lng: 114.17, servers: 231, endpoints: 1240, network: 67,  cloud: 370  },
  { name: 'APAC Site 3',    lat:  1.35, lng: 103.82, servers: 178, endpoints:  980, network: 51,  cloud: 260  },
  { name: 'India Hub 1',    lat: 19.08, lng:  72.88, servers: 165, endpoints: 1155, network: 66,  cloud: 297  },
  { name: 'South Hub',      lat:-33.87, lng: 151.21, servers: 134, endpoints:  820, network: 43,  cloud: 200  },
  { name: 'MEA Node',       lat: 24.45, lng:  54.38, servers: 119, endpoints:  720, network: 38,  cloud: 175  },
  { name: 'India Plant 2',  lat: 22.61, lng:  75.69, servers: 140, endpoints:  980, network: 56,  cloud: 252  },
  { name: 'India Node 3',   lat: 17.98, lng:  74.43, servers: 105, endpoints:  735, network: 42,  cloud: 189  },
  { name: 'India Plant 4',  lat: 22.80, lng:  86.20, servers: 130, endpoints:  910, network: 52,  cloud: 234  },
  { name: 'India Hub 5',    lat: 19.88, lng:  75.32, servers: 120, endpoints:  840, network: 48,  cloud: 216  },
  { name: 'India Node 6',   lat: 20.52, lng:  72.97, servers:  95, endpoints:  665, network: 38,  cloud: 171  },
  { name: 'India Plant 7',  lat: 23.03, lng:  72.58, servers: 145, endpoints: 1015, network: 58,  cloud: 261  },
  { name: 'India Hub 8',    lat: 23.26, lng:  77.41, servers: 135, endpoints:  945, network: 54,  cloud: 243  },
  { name: 'India Node 9',   lat: 13.08, lng:  80.27, servers: 115, endpoints:  805, network: 46,  cloud: 207  },
  { name: 'India Plant 10', lat: 11.01, lng:  76.97, servers: 125, endpoints:  875, network: 50,  cloud: 225  },
  { name: 'India Node 11',  lat: 22.97, lng:  76.07, servers: 110, endpoints:  770, network: 44,  cloud: 198  },
  { name: 'India Hub 12',   lat: 16.70, lng:  74.24, servers: 130, endpoints:  910, network: 52,  cloud: 234  },
  { name: 'India Plant 13', lat: 21.15, lng:  79.08, servers: 155, endpoints: 1085, network: 62,  cloud: 279  },
  { name: 'India Node 14',  lat: 28.98, lng:  79.40, servers:  90, endpoints:  630, network: 36,  cloud: 162  },
  { name: 'India Hub 15',   lat: 18.52, lng:  73.86, servers: 145, endpoints: 1015, network: 58,  cloud: 261  },
];

function jitter(base: number, spread: number) {
  return +(base + (Math.random() - 0.5) * spread).toFixed(4);
}

export async function GET() {
  await delay(600 + Math.random() * 200);
  try {
    const it_assets: any[] = [];
    for (const site of IT_SITES) {
      const total = site.servers + site.endpoints + site.network + site.cloud;
      const dots = Math.min(Math.floor(total / 50), 70);
      for (let i = 0; i < dots; i++) {
        const categories = ['server','endpoint','network','cloud'] as const;
        const cat = categories[i % 4];
        it_assets.push({
          id: `${site.name.replace(/ /g, '-').toLowerCase()}-${i}`,
          name: `${site.name} / ${cat} #${i + 1}`,
          lat: jitter(site.lat, 0.3),
          lng: jitter(site.lng, 0.3),
          category: cat,
          site: site.name,
          total_assets: total,
        });
      }
    }
    return NextResponse.json(
      { it_assets, total: IT_SITES.reduce((a, s) => a + s.servers + s.endpoints + s.network + s.cloud, 0), timestamp: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch {
    return NextResponse.json({ it_assets: [] }, { status: 500 });
  }
}
