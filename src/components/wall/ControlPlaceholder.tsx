'use client';

import { WallStateProvider, useWallState } from '@/lib/useWallState';
import { ALL_LAYERS } from '@/data/layerMap';
import type { ViewId, WallSlot } from '@/server/wallState';

const demoViews: ViewId[] = ['map', 'alerts', 'blank'];
const demoSlots: WallSlot[] = ['1', '2', '3', '4', '5', '6'];

function ControlPlaceholderInner() {
  const {
    state,
    clientId,
    connectionStatus,
    updateFilters,
    assignSlot,
    resetWall,
  } = useWallState();

  const activeDomains = state?.filters.activeDomains ?? [];
  const firstDomain = ALL_LAYERS[0]?.key;
  const hasFirstDomain = firstDomain ? activeDomains.includes(firstDomain) : false;

  return (
    <main className="min-h-screen bg-[var(--sc-bg-0)] p-6 text-[var(--sc-text)]">
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-ui-xs uppercase tracking-[0.18em] text-[var(--sc-primary)]">Operator Control Proof</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--sc-text-strong)]">Wall Sync Control</h1>
          </div>
          <div className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-[var(--sc-surface-solid)] px-4 py-3 font-mono text-ui-xs text-[var(--sc-text-muted)]">
            {connectionStatus} · {clientId ? clientId.slice(0, 8) : 'pending'}
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <section className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-[var(--sc-surface-solid)] p-5">
            <h2 className="text-ui-lg font-semibold text-[var(--sc-text-strong)]">Filter Mutations</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] px-4 py-2 text-ui-sm hover:border-[var(--sc-border-strong)]"
                onClick={() => updateFilters({ timeRange: state?.filters.timeRange === '1h' ? '24h' : '1h' })}
              >
                Toggle 1h / 24h
              </button>
              <button
                className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] px-4 py-2 text-ui-sm hover:border-[var(--sc-border-strong)]"
                onClick={() => firstDomain && updateFilters({
                  activeDomains: hasFirstDomain
                    ? activeDomains.filter(domain => domain !== firstDomain)
                    : [...activeDomains, firstDomain],
                })}
              >
                Toggle first domain
              </button>
              <button
                className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] px-4 py-2 text-ui-sm hover:border-[var(--sc-border-strong)]"
                onClick={() => updateFilters({ selectedSiteId: state?.filters.selectedSiteId ? null : 'north-hub' })}
              >
                Toggle site filter
              </button>
              <button
                className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] px-4 py-2 text-ui-sm hover:border-[var(--sc-border-strong)]"
                onClick={() => resetWall()}
              >
                Reset
              </button>
            </div>
          </section>

          <section className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-[var(--sc-surface-solid)] p-5">
            <h2 className="text-ui-lg font-semibold text-[var(--sc-text-strong)]">Assignment Mutations</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {demoSlots.map(slot => (
                <div key={slot} className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] p-3">
                  <div className="mb-2 flex items-center justify-between font-mono text-ui-xs uppercase tracking-[0.14em] text-[var(--sc-text-muted)]">
                    <span>Slot {slot}</span>
                    <span>{state?.screenAssignments[slot] ?? 'loading'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {demoViews.map(view => (
                      <button
                        key={view}
                        className="rounded-[var(--sc-radius)] bg-[var(--sc-hover)] px-3 py-1.5 text-ui-xs text-[var(--sc-text-strong)] hover:text-[var(--sc-primary)]"
                        onClick={() => assignSlot(slot, view)}
                      >
                        {view}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <pre className="max-h-[40vh] overflow-auto rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/40 p-5 font-mono text-ui-xs leading-relaxed">
          {JSON.stringify(state, null, 2)}
        </pre>
      </section>
    </main>
  );
}

export function ControlPlaceholder() {
  return (
    <WallStateProvider>
      <ControlPlaceholderInner />
    </WallStateProvider>
  );
}
