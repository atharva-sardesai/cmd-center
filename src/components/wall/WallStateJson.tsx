'use client';

import { WallStateProvider, useWallState } from '@/lib/useWallState';

function WallStateJsonInner() {
  const { state, clientId, connectionStatus, lastRemoteVersion } = useWallState();

  return (
    <main className="min-h-screen bg-[var(--sc-bg-0)] p-8 font-mono text-[var(--sc-text)]">
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <div>
          <p className="text-ui-sm uppercase tracking-[0.16em] text-[var(--sc-primary)]">Sentinel Wall Sync Test</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--sc-text-strong)]">Live Shared State</h1>
        </div>

        <div className="grid gap-3 text-ui-sm md:grid-cols-3">
          <div className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-[var(--sc-surface-solid)] p-4">
            <span className="block text-[var(--sc-text-muted)]">Client</span>
            <span className="break-all text-[var(--sc-text-strong)]">{clientId || 'initializing'}</span>
          </div>
          <div className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-[var(--sc-surface-solid)] p-4">
            <span className="block text-[var(--sc-text-muted)]">Connection</span>
            <span className="text-[var(--sc-text-strong)]">{connectionStatus}</span>
          </div>
          <div className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-[var(--sc-surface-solid)] p-4">
            <span className="block text-[var(--sc-text-muted)]">Last remote version</span>
            <span className="text-[var(--sc-text-strong)]">{lastRemoteVersion ?? 'none'}</span>
          </div>
        </div>

        <pre className="min-h-[50vh] overflow-auto rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/40 p-5 text-ui-sm leading-relaxed text-[var(--sc-text)]">
          {JSON.stringify(state, null, 2)}
        </pre>
      </section>
    </main>
  );
}

export function WallStateJson() {
  return (
    <WallStateProvider>
      <WallStateJsonInner />
    </WallStateProvider>
  );
}
