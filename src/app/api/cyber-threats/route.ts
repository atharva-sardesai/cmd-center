// DEMO MOCK — returns fictional data.
// In production, replace this body with the real backend fetch; the response shape is unchanged.

import { NextResponse } from 'next/server';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const ASSURANCE_EVENTS = [
  { lat: 40.71, lng: -74.01, name: 'FinCore ERP — Pen Test',          app: 'FinCore ERP',         findings: 3,  severity: 'LOW',      status: 'Closed'     },
  { lat: 48.85, lng:   2.35, name: 'HR Portal — DAST Scan',           app: 'HR Portal',           findings: 14, severity: 'HIGH',     status: 'Open'       },
  { lat: 51.51, lng:  -0.13, name: 'Customer CRM — Code Review',      app: 'Customer CRM',        findings: 31, severity: 'CRITICAL', status: 'In Remediation'},
  { lat: 37.77, lng:-122.42, name: 'API Gateway — SAST Analysis',     app: 'API Gateway',         findings: 7,  severity: 'MEDIUM',   status: 'Open'       },
  { lat: 35.68, lng: 139.65, name: 'Data Lake v2 — Threat Model',     app: 'Data Lake v2',        findings: 19, severity: 'HIGH',     status: 'Open'       },
  { lat: 22.32, lng: 114.17, name: 'OT Monitor — ICS Audit',          app: 'OT Monitor',          findings: 44, severity: 'CRITICAL', status: 'In Remediation'},
  { lat:  1.35, lng: 103.82, name: 'Identity Hub — Auth Review',      app: 'Identity Hub',        findings: 2,  severity: 'LOW',      status: 'Closed'     },
  { lat: 19.08, lng:  72.88, name: 'SCADA Viewer — Binary Analysis',  app: 'SCADA Viewer',        findings: 58, severity: 'CRITICAL', status: 'Open'       },
  { lat: 59.91, lng:  10.75, name: 'EMEA Bus — DAST Scan',            app: 'EMEA Service Bus',    findings: 11, severity: 'MEDIUM',   status: 'Open'       },
  { lat:-33.87, lng: 151.21, name: 'Cloud Backup — Config Review',    app: 'Cloud Backup',        findings: 5,  severity: 'LOW',      status: 'Closed'     },
  { lat: 24.45, lng:  54.38, name: 'Supply Chain — Pen Test',         app: 'Supply Chain Portal', findings: 27, severity: 'HIGH',     status: 'Open'       },
  { lat:-23.55, lng: -46.63, name: 'LATAM ERP — SAST Scan',           app: 'LATAM ERP Node',      findings: 9,  severity: 'MEDIUM',   status: 'Open'       },
  { lat: 41.88, lng: -87.63, name: 'Contractor Portal — Pen Test',    app: 'Contractor Portal',   findings: 33, severity: 'HIGH',     status: 'In Remediation'},
  { lat: 33.75, lng: -84.39, name: 'DevOps Platform — SAST',          app: 'DevOps Platform',     findings: 6,  severity: 'LOW',      status: 'Closed'     },
  { lat: 48.20, lng:  16.37, name: 'MES Interface — ICS Audit',       app: 'MES Interface',       findings: 67, severity: 'CRITICAL', status: 'Open'       },
];

const total_open = ASSURANCE_EVENTS.filter(e => e.status !== 'Closed').reduce((a, e) => a + e.findings, 0);

export async function GET() {
  await delay(350 + Math.random() * 300);
  try {
    return NextResponse.json(
      {
        assurance_events: ASSURANCE_EVENTS,
        stats: { active_cves: total_open, critical: ASSURANCE_EVENTS.filter(e => e.severity === 'CRITICAL').length },
        total: ASSURANCE_EVENTS.length,
        timestamp: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch {
    return NextResponse.json({ assurance_events: [], stats: { active_cves: 0 } }, { status: 500 });
  }
}
