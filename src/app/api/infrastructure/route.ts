// DEMO MOCK — layer removed from demo; returns empty payload.
// In production, replace this body with the real backend fetch; the response shape is unchanged.

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { infrastructure: [], total: 0, timestamp: new Date().toISOString() },
    { headers: { 'Cache-Control': 'public, s-maxage=3600' } }
  );
}
