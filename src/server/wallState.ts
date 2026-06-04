import { ALL_LAYERS } from '@/data/layerMap';

export type ViewId =
  | 'map'
  | 'alerts'
  | 'ot-deep-dive'
  | 'it-deep-dive'
  | 'posture-trend'
  | 'activity-feed'
  | 'kpi-grid'
  | 'awareness-board'
  | 'blank';

export type WallSlot = '1' | '2' | '3' | '4' | '5' | '6';

export type TimeRange = '1h' | '24h' | '7d' | '30d';

export type WallFilters = {
  selectedSiteId: string | null;
  timeRange: TimeRange;
  activeDomains: string[];
};

export type WallState = {
  screenAssignments: Record<WallSlot, ViewId>;
  filters: WallFilters;
  lastUpdated: string;
  updatedBy: string;
  version: number;
};

type WallSubscriber = (state: WallState) => void;

type WallStore = {
  state: WallState;
  subscribers: Set<WallSubscriber>;
};

const DEFAULT_ASSIGNMENTS: Record<WallSlot, ViewId> = {
  '1': 'map',
  '2': 'alerts',
  '3': 'ot-deep-dive',
  '4': 'it-deep-dive',
  '5': 'posture-trend',
  '6': 'activity-feed',
};

const DEFAULT_DOMAINS = ALL_LAYERS.map(layer => layer.key);

const makeDefaultState = (updatedBy = 'system', version = 0): WallState => ({
  screenAssignments: { ...DEFAULT_ASSIGNMENTS },
  filters: {
    selectedSiteId: null,
    timeRange: '24h',
    activeDomains: [...DEFAULT_DOMAINS],
  },
  lastUpdated: new Date().toISOString(),
  updatedBy,
  version,
});

const globalWallStore = globalThis as typeof globalThis & {
  __sentinelWallStore?: WallStore;
};

const store: WallStore = globalWallStore.__sentinelWallStore ?? {
  state: makeDefaultState(),
  subscribers: new Set<WallSubscriber>(),
};

globalWallStore.__sentinelWallStore = store;

export const WALL_SLOTS: WallSlot[] = ['1', '2', '3', '4', '5', '6'];

export const WALL_VIEWS: ViewId[] = [
  'map',
  'alerts',
  'ot-deep-dive',
  'it-deep-dive',
  'posture-trend',
  'activity-feed',
  'kpi-grid',
  'awareness-board',
  'blank',
];

export function getState(): WallState {
  return {
    ...store.state,
    screenAssignments: { ...store.state.screenAssignments },
    filters: {
      ...store.state.filters,
      activeDomains: [...store.state.filters.activeDomains],
    },
  };
}

function publish(nextState: WallState) {
  store.state = nextState;
  store.subscribers.forEach(cb => cb(getState()));
}

function nextState(patch: Partial<WallState>, clientId: string): WallState {
  return {
    ...store.state,
    ...patch,
    lastUpdated: new Date().toISOString(),
    updatedBy: clientId,
    version: store.state.version + 1,
  };
}

export function updateFilters(partial: Partial<WallFilters>, clientId: string): WallState {
  const nextFilters: WallFilters = {
    ...store.state.filters,
    ...partial,
    activeDomains: partial.activeDomains
      ? [...partial.activeDomains]
      : [...store.state.filters.activeDomains],
  };
  const updated = nextState({ filters: nextFilters }, clientId);
  publish(updated);
  return getState();
}

export function assignSlot(slot: WallSlot, view: ViewId, clientId: string): WallState {
  const updated = nextState({
    screenAssignments: {
      ...store.state.screenAssignments,
      [slot]: view,
    },
  }, clientId);
  publish(updated);
  return getState();
}

export function resetState(clientId = 'system'): WallState {
  const updated = makeDefaultState(clientId, store.state.version + 1);
  publish(updated);
  return getState();
}

export function subscribe(cb: WallSubscriber): void {
  store.subscribers.add(cb);
}

export function unsubscribe(cb: WallSubscriber): void {
  store.subscribers.delete(cb);
}

export function isWallSlot(value: unknown): value is WallSlot {
  return typeof value === 'string' && WALL_SLOTS.includes(value as WallSlot);
}

export function isViewId(value: unknown): value is ViewId {
  return typeof value === 'string' && WALL_VIEWS.includes(value as ViewId);
}

export function isTimeRange(value: unknown): value is TimeRange {
  return value === '1h' || value === '24h' || value === '7d' || value === '30d';
}

export function isDomainKey(value: unknown): value is string {
  return typeof value === 'string' && DEFAULT_DOMAINS.includes(value);
}
