// DEMO MOCK — returns fictional placeholder region data.
// In production, replace this body with the real backend fetch; the response shape is unchanged.

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    name: 'Demo Region',
    country: 'N/A',
    summary: 'Region intelligence is disabled in demo mode. Connect a live backend to enable real region dossiers.',
    risk_level: 'UNKNOWN',
    timestamp: new Date().toISOString(),
  });
}
