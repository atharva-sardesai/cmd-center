// DEMO MOCK — returns fictional data.
// In production, replace this body with the real backend fetch; the response shape is unchanged.

import { NextResponse } from 'next/server';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Fictional application portfolio for App Governance
// Spread around the globe as if each app's risk were a satellite orbit dot
const APP_STATUSES = ['Compliant','Review Due','Non-Compliant','Decommissioning'] as const;
const APP_MISSIONS = ['Compliant','Review Due','Non-Compliant','Decommissioning'] as const;

const APPS = [
  { name: 'FinCore ERP',         risk: 'LOW',    status: 'Compliant',        lat: 40.71, lng: -74.01, findings: 2  },
  { name: 'HR Portal',           risk: 'MEDIUM', status: 'Review Due',       lat: 48.85, lng:   2.35, findings: 8  },
  { name: 'Customer CRM',        risk: 'HIGH',   status: 'Non-Compliant',    lat: 51.51, lng:  -0.13, findings: 23 },
  { name: 'API Gateway',         risk: 'LOW',    status: 'Compliant',        lat: 37.77, lng:-122.42, findings: 1  },
  { name: 'Data Lake v2',        risk: 'MEDIUM', status: 'Review Due',       lat: 35.68, lng: 139.65, findings: 11 },
  { name: 'OT Monitor',          risk: 'HIGH',   status: 'Non-Compliant',    lat: 22.32, lng: 114.17, findings: 31 },
  { name: 'Identity Hub',        risk: 'LOW',    status: 'Compliant',        lat:  1.35, lng: 103.82, findings: 0  },
  { name: 'SCADA Viewer',        risk: 'CRITICAL','status': 'Non-Compliant', lat: 19.08, lng:  72.88, findings: 47 },
  { name: 'EMEA Service Bus',    risk: 'MEDIUM', status: 'Review Due',       lat: 59.91, lng:  10.75, findings: 14 },
  { name: 'Cloud Backup',        risk: 'LOW',    status: 'Compliant',        lat:-33.87, lng: 151.21, findings: 3  },
  { name: 'Supply Chain Portal', risk: 'HIGH',   status: 'Non-Compliant',    lat: 24.45, lng:  54.38, findings: 19 },
  { name: 'LATAM ERP Node',      risk: 'MEDIUM', status: 'Review Due',       lat:-23.55, lng: -46.63, findings: 7  },
  { name: 'Contractor Portal',   risk: 'HIGH',   status: 'Non-Compliant',    lat: 41.88, lng: -87.63, findings: 27 },
  { name: 'DevOps Platform',     risk: 'LOW',    status: 'Compliant',        lat: 33.75, lng: -84.39, findings: 4  },
  { name: 'MES Interface',       risk: 'CRITICAL','status': 'Non-Compliant', lat: 48.20, lng:  16.37, findings: 52 },
  { name: 'Docs Platform',       risk: 'LOW',    status: 'Compliant',        lat: 52.52, lng:  13.40, findings: 1  },
  { name: 'Mobile MDM',          risk: 'MEDIUM', status: 'Review Due',       lat: 55.68, lng:  12.57, findings: 9  },
  { name: 'SOC Dashboard',       risk: 'LOW',    status: 'Compliant',        lat: 50.85, lng:   4.35, findings: 0  },
  { name: 'Patch Manager',       risk: 'HIGH',   status: 'Non-Compliant',    lat: 47.38, lng:   8.54, findings: 22 },
  { name: 'Secrets Vault',       risk: 'LOW',    status: 'Compliant',        lat: 43.30, lng:   5.37, findings: 0  },
];

const COLOR_MAP: Record<string, string> = {
  Compliant: '#00E676', 'Review Due': '#FFD700', 'Non-Compliant': '#FF9500', Decommissioning: '#757575',
};

export async function GET() {
  await delay(400 + Math.random() * 400);
  try {
    const governance_apps = APPS.map(a => ({
      ...a,
      color: COLOR_MAP[a.status] ?? '#aaa',
      mission: a.status,
    }));
    return NextResponse.json(
      { governance_apps, satellites: governance_apps, total: governance_apps.length, timestamp: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch {
    return NextResponse.json({ governance_apps: [], satellites: [] }, { status: 500 });
  }
}
