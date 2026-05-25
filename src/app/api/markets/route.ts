// DEMO MOCK — returns fictional data.
// In production, replace this body with the real backend fetch; the response shape is unchanged.

import { NextResponse } from 'next/server';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function GET() {
  await delay(400 + Math.random() * 300);
  // Stub — returns empty markets compatible with MarketsPanel
  return NextResponse.json(
    { indices: [], commodities: [], timestamp: new Date().toISOString() },
    { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' } }
  );
}
