'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  ViewId,
  WallFilters,
  WallSlot,
  WallState,
} from '@/server/wallState';

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

type WallStateContextValue = {
  state: WallState | null;
  clientId: string;
  connectionStatus: ConnectionStatus;
  lastRemoteVersion: number | null;
  updateFilters: (filters: Partial<WallFilters>) => Promise<void>;
  assignSlot: (slot: WallSlot, view: ViewId) => Promise<void>;
  resetWall: () => Promise<void>;
  isOwnEcho: (state: WallState | null) => boolean;
};

const WallStateContext = createContext<WallStateContextValue | null>(null);

const CLIENT_ID_KEY = 'sentinel-wall-client-id';

function makeClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `wall-client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getClientId(): string {
  const existing = sessionStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;
  const next = makeClientId();
  sessionStorage.setItem(CLIENT_ID_KEY, next);
  return next;
}

async function postJson(endpoint: string, body: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Wall state mutation failed: ${response.status}`);
  }
}

export function WallStateProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientId] = useState('');
  const [state, setState] = useState<WallState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [lastRemoteVersion, setLastRemoteVersion] = useState<number | null>(null);
  const lastMutationByThisClient = useRef<number | null>(null);

  useEffect(() => {
    setClientId(getClientId());
  }, []);

  useEffect(() => {
    if (!clientId) return;

    let closed = false;
    setConnectionStatus(prev => (prev === 'disconnected' ? 'reconnecting' : 'connecting'));

    const eventSource = new EventSource(`/api/wall/stream?clientId=${encodeURIComponent(clientId)}`);

    eventSource.onopen = () => {
      if (!closed) setConnectionStatus('connected');
    };

    eventSource.onmessage = event => {
      if (closed) return;
      const nextState = JSON.parse(event.data) as WallState;
      setState(nextState);

      if (nextState.updatedBy !== clientId) {
        setLastRemoteVersion(nextState.version);
      } else {
        lastMutationByThisClient.current = nextState.version;
      }
    };

    eventSource.onerror = () => {
      if (!closed) setConnectionStatus('reconnecting');
    };

    return () => {
      closed = true;
      eventSource.close();
      setConnectionStatus('disconnected');
    };
  }, [clientId]);

  const updateFilters = useCallback(async (filters: Partial<WallFilters>) => {
    if (!clientId) return;
    await postJson('/api/wall/state/filters', { filters, clientId });
  }, [clientId]);

  const assignSlot = useCallback(async (slot: WallSlot, view: ViewId) => {
    if (!clientId) return;
    await postJson('/api/wall/state/assignments', { slot, view, clientId });
  }, [clientId]);

  const resetWall = useCallback(async () => {
    if (!clientId) return;
    await postJson('/api/wall/state/reset', { clientId });
  }, [clientId]);

  const isOwnEcho = useCallback((candidate: WallState | null) => {
    if (!candidate || !clientId) return false;
    return candidate.updatedBy === clientId && candidate.version === lastMutationByThisClient.current;
  }, [clientId]);

  const value = useMemo<WallStateContextValue>(() => ({
    state,
    clientId,
    connectionStatus,
    lastRemoteVersion,
    updateFilters,
    assignSlot,
    resetWall,
    isOwnEcho,
  }), [
    state,
    clientId,
    connectionStatus,
    lastRemoteVersion,
    updateFilters,
    assignSlot,
    resetWall,
    isOwnEcho,
  ]);

  return (
    <WallStateContext.Provider value={value}>
      {children}
    </WallStateContext.Provider>
  );
}

export function useWallState() {
  const context = useContext(WallStateContext);
  if (!context) {
    throw new Error('useWallState must be used inside WallStateProvider');
  }
  return context;
}
