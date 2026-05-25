// DEMO MOCK — RECON scanner disabled in demo mode.
// In production, set SCANNER_URL and SCANNER_KEY env vars and restore the real fetch.

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'RECON scanner is disabled in demo mode.' },
    { status: 503 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: 'RECON scanner is disabled in demo mode.' },
    { status: 503 }
  );
}
