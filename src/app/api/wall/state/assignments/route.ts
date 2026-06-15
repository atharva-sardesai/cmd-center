import { NextResponse } from 'next/server';
import { assignSlot, isViewId, isWallSlot } from '@/server/wallState';

export const dynamic = 'force-dynamic';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function POST(request: Request) {
  const body = await request.json().catch((): Record<string, unknown> | null => null);
  if (
    !isRecord(body)
    || typeof body.clientId !== 'string'
    || !isWallSlot(body.slot)
    || !isViewId(body.view)
  ) {
    return NextResponse.json({ error: 'Invalid wall assignment payload' }, { status: 400 });
  }

  return NextResponse.json(assignSlot(body.slot, body.view, body.clientId), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
