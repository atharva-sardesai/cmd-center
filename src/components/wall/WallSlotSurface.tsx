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
    <main className="relative grid h-screen w-screen grid-rows-[minmax(0,1fr)_44px] overflow-hidden bg-[radial-gradient(circle_at_50%_10%,rgba(0,213,232,0.08),transparent_34%),var(--sc-bg-0)] text-[var(--sc-text)]">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            nextjs-portal,
            [data-nextjs-toast],
            [data-nextjs-dialog-overlay],
            [data-nextjs-dialog],
            [data-nextjs-errors],
            [data-nextjs-terminal] {
              display: none !important;
            }
          `,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_18%,rgba(0,0,0,0.34))]" />

      <div className="relative min-h-0 overflow-hidden">
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
      </div>

      <footer className="relative z-50 flex min-h-0 items-center justify-between border-t border-[var(--sc-border)] bg-black/45 px-5 font-mono text-[12px] uppercase tracking-[0.12em] text-[var(--sc-text-muted)]">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: statusColor(connectionStatus) }}
          />
          {connectionStatus}
        </div>
        <div className="flex items-center gap-3 text-[var(--sc-text-strong)]">
          <span>S{slot}</span>
          <span className="text-[var(--sc-text-subtle)]">DEMO DATA</span>
        </div>
      </footer>
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
