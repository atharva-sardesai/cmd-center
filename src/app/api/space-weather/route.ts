// DEMO MOCK — returns fictional data.
// In production, replace this body with the real backend fetch; the response shape is unchanged.

import { NextResponse } from 'next/server';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function GET() {
  await delay(300 + Math.random() * 200);
  // Stub — returns minimal data compatible with MarketsPanel's Kp index display
  return NextResponse.json(
    { kp_index: 2, solar_wind: 380, status: 'QUIET', timestamp: new Date().toISOString() },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
  );
}
