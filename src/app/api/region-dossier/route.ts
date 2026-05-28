// DEMO MOCK — returns fictional placeholder region data.
// In production, replace this body with the real backend fetch; the response shape is unchanged.

import { NextResponse } from 'next/server';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function GET() {
  await delay(300 + Math.random() * 500);
  try {
    return NextResponse.json(
      {
        location: { display_name: 'Demo Region' },
        country: {
          flag: '',
          name: 'N/A',
          capital: 'N/A',
          population: 0,
          region: 'N/A',
          subregion: 'N/A',
          languages: ['N/A'],
          area: 0,
        },
        summary: 'Region dossier data is disabled in demo mode. Connect a fictional backend adapter to enable this panel.',
        risk_level: 'UNKNOWN',
        timestamp: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch {
    return NextResponse.json({ location: null, country: null, risk_level: 'UNKNOWN' }, { status: 500 });
  }
}
