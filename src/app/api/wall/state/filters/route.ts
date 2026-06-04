import { NextResponse } from 'next/server';
import {
  isDomainKey,
  isTimeRange,
  updateFilters,
  type WallFilters,
} from '@/server/wallState';

export const dynamic = 'force-dynamic';

type FiltersBody = {
  filters?: Partial<WallFilters>;
  clientId?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseFilters(value: unknown): Partial<WallFilters> | null {
  if (!isRecord(value)) return null;

  const filters: Partial<WallFilters> = {};

  if ('selectedSiteId' in value) {
    if (value.selectedSiteId !== null && typeof value.selectedSiteId !== 'string') return null;
    filters.selectedSiteId = value.selectedSiteId;
  }

  if ('timeRange' in value) {
    if (!isTimeRange(value.timeRange)) return null;
    filters.timeRange = value.timeRange;
  }

  if ('activeDomains' in value) {
    if (!Array.isArray(value.activeDomains) || !value.activeDomains.every(isDomainKey)) return null;
    filters.activeDomains = value.activeDomains;
  }

  return filters;
}

export async function POST(request: Request) {
  const body = await request.json().catch((): FiltersBody | null => null);
  if (!isRecord(body) || typeof body.clientId !== 'string') {
    return NextResponse.json({ error: 'Invalid wall filter update payload' }, { status: 400 });
  }

  const filters = parseFilters(body.filters);
  if (!filters) {
    return NextResponse.json({ error: 'Invalid wall filters' }, { status: 400 });
  }

  return NextResponse.json(updateFilters(filters, body.clientId), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
