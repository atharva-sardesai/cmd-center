// DEMO MOCK — layer removed from demo; returns empty payload.
import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ frontlines: [], timestamp: new Date().toISOString() });
}
