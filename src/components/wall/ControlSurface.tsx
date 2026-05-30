'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  LayoutGrid,
  Monitor,
  Radio,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Upload,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ALL_LAYERS } from '@/data/layerMap';
import { MASTER_SITES } from '@/data/sites';
import { WallStateProvider, useWallState } from '@/lib/useWallState';
import { ViewRenderer, WALL_VIEW_META } from '@/components/wall/ViewRenderer';
import type { TimeRange, ViewId, WallFilters, WallSlot } from '@/server/wallState';

const WALL_SLOTS: WallSlot[] = ['1', '2', '3', '4', '5', '6'];
const WALL_VIEWS = Object.keys(WALL_VIEW_META) as ViewId[];
const TIME_RANGES: TimeRange[] = ['1h', '24h', '7d', '30d'];
const ALL_DOMAIN_KEYS = ALL_LAYERS.map(layer => layer.key);

type LayoutPreset = {
  name: string;
  description: string;
  assignments: Record<WallSlot, ViewId>;
  filters: WallFilters;
};

const PRESETS: LayoutPreset[] = [
  {
    name: 'Normal Ops',
    description: 'Map-led operating view with alerts and asset context.',
    assignments: {
      '1': 'map',
      '2': 'alerts',
      '3': 'ot-deep-dive',
      '4': 'it-deep-dive',
      '5': 'posture-trend',
      '6': 'activity-feed',
    },
    filters: { selectedSiteId: null, timeRange: '24h', activeDomains: ALL_DOMAIN_KEYS },
  },
  {
    name: 'Incident Mode',
    description: 'Alert-heavy view for response coordination.',
    assignments: {
      '1': 'alerts',
      '2': 'map',
      '3': 'activity-feed',
      '4': 'ot-deep-dive',
      '5': 'it-deep-dive',
      '6': 'posture-trend',
    },
    filters: {
      selectedSiteId: null,
      timeRange: '1h',
      activeDomains: ['exposure', 'app_assurance', 'dlp', 'ot_assets', 'it_assets', 'access_recert'],
    },
  },
  {
    name: 'Executive View',
    description: 'High-level posture, KPIs, awareness, and map.',
    assignments: {
      '1': 'kpi-grid',
      '2': 'map',
      '3': 'posture-trend',
      '4': 'awareness-board',
      '5': 'alerts',
      '6': 'blank',
    },
    filters: { selectedSiteId: null, timeRange: '7d', activeDomains: ALL_DOMAIN_KEYS },
  },
  {
    name: 'After Hours',
    description: 'Quiet monitoring view with minimal motion.',
    assignments: {
      '1': 'map',
      '2': 'alerts',
      '3': 'activity-feed',
      '4': 'blank',
      '5': 'blank',
      '6': 'blank',
    },
    filters: {
      selectedSiteId: null,
      timeRange: '24h',
      activeDomains: ['exposure', 'dlp', 'ot_assets', 'it_assets', 'activity_retention', 'day_night'],
    },
  },
];

function formatTime(value?: string) {
  if (!value) return 'No update yet';
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === 'connected') return 'bg-[var(--sc-status-ok)]';
  if (status === 'connecting' || status === 'reconnecting') return 'bg-[var(--sc-status-watch)]';
  return 'bg-[var(--sc-status-critical)]';
}

function viewLabel(view: ViewId) {
  return WALL_VIEW_META[view].label;
}

function filtersEqual(a: WallFilters, b: WallFilters) {
  return a.selectedSiteId === b.selectedSiteId
    && a.timeRange === b.timeRange
    && a.activeDomains.length === b.activeDomains.length
    && a.activeDomains.every(key => b.activeDomains.includes(key));
}

function ControlSurfaceInner() {
  const {
    state,
    clientId,
    connectionStatus,
    updateFilters,
    assignSlot,
    resetWall,
  } = useWallState();
  const [siteQuery, setSiteQuery] = useState('');
  const [draftFilters, setDraftFilters] = useState<WallFilters | null>(null);
  const [exploreView, setExploreView] = useState<ViewId>('map');

  const liveFilters = state?.filters ?? {
    selectedSiteId: null,
    timeRange: '24h',
    activeDomains: ALL_DOMAIN_KEYS,
  };
  const filters = draftFilters ?? liveFilters;
  const assignments = state?.screenAssignments;
  const liveSite = MASTER_SITES.find(site => site.id === liveFilters.selectedSiteId) ?? null;
  const selectedSite = MASTER_SITES.find(site => site.id === filters.selectedSiteId) ?? null;
  const draftInSync = filtersEqual(filters, liveFilters);

  useEffect(() => {
    if (state) {
      setDraftFilters(current => current ?? {
        ...state.filters,
        activeDomains: [...state.filters.activeDomains],
      });
    }
  }, [state]);

  const filteredSites = useMemo(() => {
    const query = siteQuery.trim().toLowerCase();
    if (!query) return MASTER_SITES;
    return MASTER_SITES.filter(site => (
      site.name.toLowerCase().includes(query)
      || site.region.toLowerCase().includes(query)
      || site.businessUnit.toLowerCase().includes(query)
    ));
  }, [siteQuery]);

  function updateDraft(partial: Partial<WallFilters>) {
    setDraftFilters(current => {
      const base = current ?? liveFilters;
      return {
        ...base,
        ...partial,
        activeDomains: partial.activeDomains ? [...partial.activeDomains] : [...base.activeDomains],
      };
    });
  }

  function toggleDomain(domainKey: string, checked: boolean) {
    const nextDomains = checked
      ? Array.from(new Set([...filters.activeDomains, domainKey]))
      : filters.activeDomains.filter(key => key !== domainKey);
    updateDraft({ activeDomains: nextDomains });
  }

  async function applyPreset(preset: LayoutPreset) {
    setDraftFilters({
      ...preset.filters,
      activeDomains: [...preset.filters.activeDomains],
    });
    await Promise.all(
      WALL_SLOTS.map(slot => assignSlot(slot, preset.assignments[slot]))
    );
  }

  async function pushDraftToWall() {
    await updateFilters(filters);
  }

  function syncDraftFromWall() {
    setDraftFilters({
      ...liveFilters,
      activeDomains: [...liveFilters.activeDomains],
    });
  }

  return (
    <main className="min-h-screen bg-[var(--sc-bg-0)] px-5 py-5 text-[var(--sc-text)]">
      <section className="mx-auto flex max-w-[1800px] flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-ui-xs uppercase tracking-[0.18em] text-[var(--sc-primary)]">
              Sentinel Wall Control
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--sc-text-strong)]">
              Operator Surface
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="h-8 gap-2 rounded-[var(--sc-radius)] border-[var(--sc-border)] px-3 font-mono uppercase tracking-[0.12em]">
              <span className={`h-2 w-2 rounded-full ${statusClass(connectionStatus)}`} />
              {connectionStatus}
            </Badge>
            <Badge variant="outline" className="h-8 rounded-[var(--sc-radius)] border-[var(--sc-border)] px-3 font-mono uppercase tracking-[0.12em]">
              v{state?.version ?? 0} · {formatTime(state?.lastUpdated)}
            </Badge>
            <Badge variant="outline" className="h-8 rounded-[var(--sc-radius)] border-[var(--sc-border)] px-3 font-mono uppercase tracking-[0.12em]">
              {clientId ? clientId.slice(0, 8) : 'pending'}
            </Badge>
          </div>
        </header>

        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto]">
          <Card className="border-[var(--sc-border)] bg-black/25">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-mono text-ui-xs uppercase tracking-[0.18em] text-[var(--sc-status-ok)]">On Wall</p>
                <p className="mt-1 text-ui-lg font-semibold text-[var(--sc-text-strong)]">{liveSite ? liveSite.name : 'Enterprise-wide'}</p>
                <p className="mt-1 font-mono text-ui-xs uppercase tracking-[0.12em] text-[var(--sc-text-muted)]">
                  {liveFilters.timeRange} · {liveFilters.activeDomains.length} domains
                </p>
              </div>
              <Radio className="h-5 w-5 text-[var(--sc-status-ok)]" />
            </CardContent>
          </Card>
          <Card className="border-[var(--sc-border)] bg-[color-mix(in_srgb,var(--sc-primary)_10%,transparent)]">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-mono text-ui-xs uppercase tracking-[0.18em] text-[var(--sc-primary)]">Exploring Draft</p>
                <p className="mt-1 text-ui-lg font-semibold text-[var(--sc-text-strong)]">{selectedSite ? selectedSite.name : 'Enterprise-wide'}</p>
                <p className="mt-1 font-mono text-ui-xs uppercase tracking-[0.12em] text-[var(--sc-text-muted)]">
                  {draftInSync ? 'In sync with wall' : 'Private draft only'}
                </p>
              </div>
              <SlidersHorizontal className="h-5 w-5 text-[var(--sc-primary)]" />
            </CardContent>
          </Card>
          <Button type="button" className="h-full min-h-20 justify-center" onClick={() => { void pushDraftToWall(); }} disabled={draftInSync}>
            <Upload className="h-4 w-4" />
            Push to wall
          </Button>
          <Button type="button" variant="outline" className="h-full min-h-20 justify-center" onClick={syncDraftFromWall}>
            <Download className="h-4 w-4" />
            Sync from wall
          </Button>
        </div>

        <Card className="border-[var(--sc-border)] bg-[var(--sc-surface-solid)]">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-[var(--sc-text-strong)]">Explore Privately</CardTitle>
              <CardDescription>Interactive control view. Map clicks update draft only.</CardDescription>
            </div>
            <Select value={exploreView} onValueChange={next => setExploreView(next as ViewId)}>
              <SelectTrigger className="w-[240px] border-[var(--sc-border)] bg-[var(--sc-bg-1)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WALL_VIEWS.map(option => (
                  <SelectItem key={option} value={option}>{viewLabel(option)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <ViewRenderer
              view={exploreView}
              filters={filters}
              slot="1"
              mode="control"
              onDraftSiteSelect={site => updateDraft({ selectedSiteId: site.id })}
            />
          </CardContent>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[minmax(680px,1.2fr)_minmax(420px,0.8fr)]">
          <Card className="border-[var(--sc-border)] bg-[var(--sc-surface-solid)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[var(--sc-text-strong)]">
                <LayoutGrid className="h-5 w-5 text-[var(--sc-primary)]" />
                Slot Grid
              </CardTitle>
              <CardDescription>Physical 3x2 wall layout with live assignment controls.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-3">
                {WALL_SLOTS.map(slot => {
                  const view = assignments?.[slot] ?? 'blank';
                  return (
                    <Card key={slot} size="sm" className="border-[var(--sc-border)] bg-black/20">
                      <CardHeader className="gap-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-mono text-ui-xs uppercase tracking-[0.14em] text-[var(--sc-text-muted)]">Slot {slot}</p>
                            <CardTitle className="mt-1 text-ui-md text-[var(--sc-text-strong)]">{viewLabel(view)}</CardTitle>
                          </div>
                          <Monitor className="h-5 w-5 text-[var(--sc-primary)]" />
                        </div>
                        <Select value={view} onValueChange={next => assignSlot(slot, next as ViewId)}>
                          <SelectTrigger className="w-full border-[var(--sc-border)] bg-[var(--sc-bg-1)]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WALL_VIEWS.map(option => (
                              <SelectItem key={option} value={option}>{viewLabel(option)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardHeader>
                      <CardContent>
                        <ViewRenderer view={view} filters={liveFilters} slot={slot} mode="preview" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-5">
            <Card className="border-[var(--sc-border)] bg-[var(--sc-surface-solid)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[var(--sc-text-strong)]">
                  <SlidersHorizontal className="h-5 w-5 text-[var(--sc-primary)]" />
                  Filters
                </CardTitle>
                <CardDescription>Draft filters are private until Push to wall.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="site" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-[var(--sc-bg-1)]">
                    <TabsTrigger value="site">Site</TabsTrigger>
                    <TabsTrigger value="time">Time</TabsTrigger>
                    <TabsTrigger value="domains">Domains</TabsTrigger>
                  </TabsList>

                  <TabsContent value="site" className="mt-4">
                    <div className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 p-3">
                      <div className="flex items-center gap-2 rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-[var(--sc-bg-1)] px-3">
                        <Search className="h-4 w-4 text-[var(--sc-text-muted)]" />
                        <input
                          value={siteQuery}
                          onChange={event => setSiteQuery(event.target.value)}
                          placeholder="Search sites, regions, units"
                          className="h-9 min-w-0 flex-1 bg-transparent text-ui-sm text-[var(--sc-text)] outline-none placeholder:text-[var(--sc-text-subtle)]"
                        />
                      </div>
                      <ScrollArea className="mt-3 h-[210px]">
                        <div className="flex flex-col gap-1 pr-3">
                          {filteredSites.map(site => (
                            <button
                              key={site.id}
                              className="flex items-center justify-between rounded-[var(--sc-radius)] px-3 py-2 text-left text-ui-sm hover:bg-[var(--sc-hover)]"
                              onClick={() => updateDraft({ selectedSiteId: site.id })}
                            >
                              <span>
                                <span className="block text-[var(--sc-text-strong)]">{site.name}</span>
                                <span className="font-mono text-ui-xs uppercase tracking-[0.12em] text-[var(--sc-text-muted)]">
                                  {site.region} · {site.businessUnit}
                                </span>
                              </span>
                              <span className="font-mono text-ui-xs text-[var(--sc-primary)]">{site.postureScore}</span>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </TabsContent>

                  <TabsContent value="time" className="mt-4">
                    <div className="grid grid-cols-4 gap-2">
                      {TIME_RANGES.map(range => (
                        <Button
                          key={range}
                          variant={filters.timeRange === range ? 'default' : 'outline'}
                          className="h-10"
                          onClick={() => updateDraft({ timeRange: range })}
                        >
                          {range}
                        </Button>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="domains" className="mt-4">
                    <ScrollArea className="h-[280px] rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20">
                      <div className="flex flex-col gap-2 p-3">
                        {ALL_LAYERS.map(layer => (
                          <label
                            key={layer.key}
                            className="flex items-center justify-between gap-3 rounded-[var(--sc-radius)] px-3 py-2 hover:bg-[var(--sc-hover)]"
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              <layer.Icon className="h-4 w-4 shrink-0 text-[var(--sc-primary)]" />
                              <span className="min-w-0">
                                <span className="block truncate text-ui-sm text-[var(--sc-text-strong)]">{layer.label}</span>
                                <span className="block truncate font-mono text-ui-xs uppercase tracking-[0.12em] text-[var(--sc-text-muted)]">{layer.group}</span>
                              </span>
                            </span>
                            <Switch
                              checked={filters.activeDomains.includes(layer.key)}
                              onCheckedChange={checked => toggleDomain(layer.key, checked)}
                            />
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>

                <Separator className="my-4 bg-[var(--sc-border)]" />

                <div className="rounded-[var(--sc-radius)] border border-[var(--sc-border)] bg-black/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-ui-xs uppercase tracking-[0.16em] text-[var(--sc-text-muted)]">Current scope</p>
                      <p className="mt-1 text-ui-lg font-semibold text-[var(--sc-text-strong)]">
                        {selectedSite ? selectedSite.name : 'Enterprise-wide'}
                      </p>
                      <p className="mt-1 font-mono text-ui-xs uppercase tracking-[0.12em] text-[var(--sc-text-muted)]">
                        {filters.timeRange} · {filters.activeDomains.length} active domains
                      </p>
                    </div>
                    {selectedSite && (
                      <Button variant="outline" size="sm" onClick={() => updateDraft({ selectedSiteId: null })}>
                        <X className="h-4 w-4" />
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[var(--sc-border)] bg-[var(--sc-surface-solid)]">
              <CardHeader>
                <CardTitle className="text-[var(--sc-text-strong)]">Layout Presets</CardTitle>
                <CardDescription>Presets update wall layout now and stage their filters as draft.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {PRESETS.map(preset => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    className="h-auto justify-start whitespace-normal px-3 py-3 text-left"
                    onClick={() => applyPreset(preset)}
                  >
                    <span>
                      <span className="block text-ui-sm text-[var(--sc-text-strong)]">{preset.name}</span>
                      <span className="mt-1 block text-ui-xs text-[var(--sc-text-muted)]">{preset.description}</span>
                    </span>
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="border-[var(--sc-border)] bg-[var(--sc-surface-solid)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[var(--sc-text-strong)]">
                  <Radio className="h-5 w-5 text-[var(--sc-primary)]" />
                  Wall Session
                </CardTitle>
                <CardAction>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      await resetWall();
                      setDraftFilters({
                        ...PRESETS[0].filters,
                        activeDomains: [...PRESETS[0].filters.activeDomains],
                      });
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                </CardAction>
                <CardDescription>
                  Last update by {state?.updatedBy ? state.updatedBy.slice(0, 8) : 'system'}.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

export function ControlSurface() {
  return (
    <WallStateProvider>
      <ControlSurfaceInner />
    </WallStateProvider>
  );
}
