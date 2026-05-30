'use client';

import { WallStateProvider, useWallState } from '@/lib/useWallState';
import { ViewRenderer } from '@/components/wall/ViewRenderer';
import type { WallSlot } from '@/server/wallState';

function statusColor(status: string) {
  if (status === 'connected') return 'var(--sc-status-ok)';
  if (status === 'reconnecting' || status === 'connecting') return 'var(--sc-status-watch)';
  return 'var(--sc-status-critical)';
}

function WallSlotSurfaceInner({ slot }: { slot: WallSlot }) {
  const { state, connectionStatus, isOwnEcho } = useWallState();
  const view = state?.screenAssignments[slot];
  const filters = state?.filters;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[radial-gradient(circle_at_50%_10%,rgba(0,213,232,0.08),transparent_34%),var(--sc-bg-0)] text-[var(--sc-text)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_18%,rgba(0,0,0,0.34))]" />

      {view && filters ? (
        <ViewRenderer
          view={view}
          filters={filters}
          slot={slot}
          suppressTransition={isOwnEcho(state)}
        />
      ) : (
        <section className="absolute inset-0 grid place-items-center px-12 py-14">
          <div className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-[var(--sc-surface)] px-12 py-10 text-center">
            <p className="font-mono text-[28px] uppercase tracking-[0.18em] text-[var(--sc-primary)]">Slot {slot}</p>
            <h1 className="mt-5 text-[56px] font-semibold text-[var(--sc-text-strong)]">Syncing wall state</h1>
          </div>
        </section>
      )}

      <div className="absolute bottom-7 left-8 flex items-center gap-3 rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/35 px-4 py-3 font-mono text-[24px] uppercase tracking-[0.14em] text-[var(--sc-text-muted)]">
        <span
          className="h-3 w-3 rounded-full"
          style={{ background: statusColor(connectionStatus) }}
        />
        {connectionStatus}
      </div>

      <div className="absolute bottom-7 right-8 rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/35 px-4 py-3 font-mono text-[28px] font-semibold text-[var(--sc-text-strong)]">
        S{slot}
      </div>
    </main>
  );
}

export function WallSlotSurface({ slot }: { slot: WallSlot }) {
  return (
    <WallStateProvider>
      <WallSlotSurfaceInner slot={slot} />
    </WallStateProvider>
  );
}
