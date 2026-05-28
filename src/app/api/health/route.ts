// DEMO MOCK — returns fictional data. In production, replace this body
// with the real backend fetch; the response shape is unchanged.

import { NextResponse } from 'next/server';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const ENDPOINTS = [
  '/api/flights',
  '/api/cyber-threats',
  '/api/earthquakes',
  '/api/maritime',
  '/api/fires',
  '/api/cctv',
  '/api/news',
  '/api/weather',
  '/api/gdelt',
  '/api/satellites',
  '/api/live-news',
  '/api/country-risk',
  '/api/sites',
  '/api/region-dossier',
];

export async function GET() {
  await delay(300 + Math.random() * 500);
  try {
    return NextResponse.json(
      {
        status: 'operational',
        platform: 'Sentinel Command Center',
        version: '1.0.0',
        uptime: process.uptime ? Math.round(process.uptime()) : 0,
        endpoints: ENDPOINTS,
        timestamp: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch {
    return NextResponse.json({ status: 'error', platform: 'Sentinel Command Center', endpoints: [] }, { status: 500 });
  }
}
