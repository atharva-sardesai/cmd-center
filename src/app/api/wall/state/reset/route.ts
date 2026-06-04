import { NextResponse } from 'next/server';
import { resetState } from '@/server/wallState';

export const dynamic = 'force-dynamic';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function POST(request: Request) {
  const body = await request.json().catch((): Record<string, unknown> | null => null);
  const clientId = isRecord(body) && typeof body.clientId === 'string' ? body.clientId : 'system';

  return NextResponse.json(resetState(clientId), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
