// DEMO MOCK — returns fictional data. In production, replace this body
// with the real backend fetch; the response shape is unchanged.

import { NextResponse } from 'next/server';
import { MASTER_SITES } from '@/data/sites';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function GET(request: Request) {
  await delay(200 + Math.random() * 150);
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const sites = id ? MASTER_SITES.filter(s => s.id === id) : MASTER_SITES;
    return NextResponse.json(
      { sites, total: sites.length, timestamp: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
    );
  } catch {
    return NextResponse.json({ sites: [], total: 0 }, { status: 500 });
  }
}
