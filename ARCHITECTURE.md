# Sentinel Command Center Architecture

> This document describes the code that is present in this repository at the time it was written. It intentionally flags requested or product-intended areas that are **not implemented in this checkout**, rather than describing them as if they exist.

## 1. Overview

Sentinel Command Center is a security program situational-awareness dashboard. The implemented app is a single-screen, map-first desk dashboard that aggregates security activity across fictional global sites and 12 security activity/domain layers. It presents a live-feeling per-site view with map markers, domain toggles, global metrics, activity/alert feeds, and a slide-in site detail panel.

Sentinel is **not** a SIEM, detection engine, scanner, or real-time telemetry collector. It reports and visualizes data that other systems would produce. In the current repository, all security/site data is disguised, fictional demo data generated locally by code in this repo.

The requested architecture prompt mentions a multi-screen video-wall mode. **That mode is not present in this checkout**: there are no `src/app/wall/[slot]` pages, no `src/app/control` page, no `src/app/api/wall/*` routes, no wall components, no wall sync store, no SSE stream endpoint, and no kiosk launch script. The rest of this document records that absence explicitly in the wall sections.

## 2. Tech stack

Versions are from `package.json`.

| Area | Technology | Version / notes |
|---|---|---|
| Web framework | Next.js | `16.2.6`, App Router under `src/app` |
| Language | TypeScript | `^5`; `tsconfig.json` has `strict: true` |
| React | `react`, `react-dom` | `19.2.4` |
| Map rendering | `maplibre-gl` | `^5.24.0`; dynamically imported client map component |
| Animation | `framer-motion` | `^12.38.0` |
| UI primitives | shadcn/Radix-style components | `radix-ui ^1.4.3`, `shadcn ^4.8.2`, local `src/components/ui/*` |
| Styling | Tailwind CSS v4 | `tailwindcss ^4`, `@tailwindcss/postcss ^4`, `tw-animate-css ^1.4.0` |
| Icons | `lucide-react` | `^1.17.0` |
| Utilities | `clsx`, `tailwind-merge`, `class-variance-authority` | local `cn()` wrapper in `src/lib/utils.ts` |
| Images/build | `sharp` | `^0.34.5` |

Rendering model:

- `src/app/page.tsx` is a client component (`'use client'`) and owns the main dashboard state.
- `src/components/CommandMap.tsx` is dynamically imported with `ssr: false`, so MapLibre only runs in the browser.
- API routes are implemented as Next App Router route handlers in `src/app/api/*/route.ts`.
- `next.config.ts` sets `output: 'standalone'`, transpiles `maplibre-gl`, and sets `typescript.ignoreBuildErrors: true`. TypeScript errors are therefore ignored during `next build`, which is important operationally.
- `next.config.ts` allows remote images from any HTTPS host. Current core demo data does not require external image data, but the region dossier panel can render a remote thumbnail if such data is supplied.

Not present in `package.json`:

- Recharts is **not** installed in this checkout.
- No wall-specific client/server sync package is installed.

## 3. High-level architecture

The implemented app has four practical layers: client UI, API-route seam, static/demo data layer, and deployment/runtime wrappers.

```text
Browser / React UI
  ├─ src/app/page.tsx
  ├─ src/components/CommandMap.tsx       (MapLibre, browser only)
  ├─ src/components/LayerPanel.tsx
  ├─ src/components/SiteDetailPanel.tsx
  ├─ src/components/LiveAlerts.tsx
  └─ other HUD/panel components
        │
        │ fetch('/api/...') only
        ▼
Next.js API route seam
  ├─ src/app/api/flights/route.ts          exposure findings
  ├─ src/app/api/cyber-threats/route.ts    app assurance
  ├─ ... 12 domain/supporting routes ...
  └─ src/app/api/sites/route.ts            full SiteRecord list
        │
        │ imports static data or returns local mock arrays
        ▼
Data / contract layer
  ├─ src/data/sites.ts       MASTER_SITES + SiteRecord shape
  └─ src/data/layerMap.ts    layer key/display/API mapping
```

The core architectural principle is the API-route seam:

- The client never imports or calls an external data source directly for security domain data.
- The UI fetches from local `/api/*` routes.
- The route response shapes are the contract consumed by `src/app/page.tsx`, `src/components/CommandMap.tsx`, and panels.
- Replacing fictional data with real data should happen inside route bodies while preserving response shapes.

This is the same seam where a future ADF/store integration should plug in: route handlers can fetch/read from ADF/store-backed services and normalize the result to the existing JSON payloads. That should not require changing `CommandMap`, `LayerPanel`, or `SiteDetailPanel` unless the contract intentionally changes.

There is no implemented wall sync layer in the current code. See sections 7, 8, 9, and 11 for details.

## 4. Data model

### `SiteRecord`

The authoritative per-site data model is in `src/data/sites.ts`.

```ts
export type StatusLevel = 'HEALTHY' | 'WATCH' | 'CRITICAL';
export type SevLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DomainData {
  score: number;
  trend: number;
  status: StatusLevel;
}

export interface SiteRecord {
  id: string;
  name: string;
  lat: number;
  lng: number;
  region: string;
  businessUnit: string;
  postureScore: number;
  domains: {
    exposure: DomainData & {
      findings: number;
      criticals: number;
      severity: SevLevel;
    };
    app_assurance: DomainData & {
      findings: number;
      openTests: number;
    };
    arch_reviews: DomainData & {
      completed: number;
      scheduled: number;
      type: string;
    };
    dlp: DomainData & {
      policies: number;
      incidents: number;
    };
    ot_assets: DomainData & {
      plcs: number;
      hmis: number;
      scada: number;
    };
    it_assets: DomainData & {
      servers: number;
      endpoints: number;
      network: number;
      cloud: number;
    };
    awareness: DomainData & {
      completion_pct: number;
      trained: number;
      total: number;
    };
    sim_campaigns: DomainData & {
      click_rate: number;
      sent: number;
      clicked: number;
    };
    access_recert: DomainData & {
      overdue: number;
      total_users: number;
    };
    app_governance: DomainData & {
      compliant: number;
      review_due: number;
      non_compliant: number;
    };
    activity_retention: DomainData & {
      coverage_pct: number;
      days_retained: number;
    };
    posture_index: DomainData;
  };
  recentActivity: Array<{
    time: string;
    type: string;
    title: string;
    severity: SevLevel;
  }>;
}
```

Current site data:

- `MASTER_SITES` contains 28 fictional sites.
- Sites use disguised labels such as `North Hub`, `EMEA Node`, `APAC Site 1`, `India Hub 5`, etc.
- `src/data/sites.ts` builds site records from compact seeds.
- `DEMO_ACTIVITY_BASE_TIME` anchors recent activity timestamps so generated activity is deterministic rather than based on module-evaluation `Date.now()`.

### Enterprise total invariant

Enterprise totals are computed, not stored as a separate authoritative global object. Examples:

- `LayerPanel` computes global counts from API response arrays and computes selected-site counts from `selectedSite.domains.*`.
- `GlobalStatusBar` computes `OPEN CRITICALS` and `SITES AT RISK` from `MASTER_SITES`.
- `page.tsx` uses selected site data to rescope left-side KPI values when a site is selected.

### `layerMap.ts`

`src/data/layerMap.ts` is the single source of truth for:

- layer key
- display label
- description
- icon
- grouping
- `dataKeys` consumed from the `data` object
- associated `/api/*` route

Important note: the current `layerMap.ts` still includes legacy per-layer hex colors, including non-cyan colors. The visible UI has been refactored toward CSS tokens, but the file still stores those color fields for layer definitions.

## 5. The 12 security domains

The implemented display-layer/domain definitions in `src/data/layerMap.ts` are:

| Key | Display name | Group | API route / source |
|---|---|---|---|
| `exposure` | Exposure Findings | Vulnerability | `/api/flights` |
| `app_assurance` | App Assurance | Vulnerability | `/api/cyber-threats` |
| `arch_reviews` | Architecture Reviews | Vulnerability | `/api/earthquakes` |
| `dlp` | Data Loss Prevention | Data & Assets | `/api/maritime` |
| `ot_assets` | OT Asset Registry | Data & Assets | `/api/fires` |
| `it_assets` | IT Asset Registry | Data & Assets | `/api/cctv` |
| `awareness` | Awareness Reach | People & Access | `/api/news` |
| `sim_campaigns` | Simulated Campaigns | People & Access | `/api/weather` |
| `access_recert` | Access Recertification | People & Access | `/api/gdelt` |
| `app_governance` | App Governance | Governance | `/api/satellites` |
| `activity_retention` | Activity Retention | Governance | `/api/live-news` |
| `day_night` | Day / Night Cycle | Display | computed client overlay, no API route |

Caveat: `posture_index` exists in every `SiteRecord.domains` object and is used by site detail and status views, but it is not listed as a `LayerDef` in `layerMap.ts`. Conversely, `day_night` is a display overlay in `layerMap.ts` but not a `SiteRecord.domains` key.

## 6. Single-screen (desk) mode

The main desk dashboard is implemented by `src/app/page.tsx`.

### Main state owners

`page.tsx` owns:

- fetched API data via `dataRef.current`
- `activeLayers`
- `selectedSiteId` / `selectedSite`
- `mapView`
- `flyToLocation`
- panel visibility (`showLayers`, `showIntel`, mobile drawer state)
- map projection and map style controls
- region dossier state

### Data loading

`page.tsx` fetches:

- immediately: `/api/news`, `/api/country-risk`
- after a short delay: `/api/flights`, `/api/cyber-threats`, `/api/earthquakes`, `/api/maritime`, `/api/fires`, `/api/cctv`, `/api/weather`, `/api/live-news`, `/api/gdelt`, `/api/satellites`
- periodically: `/api/news` every 30 minutes

It does **not** currently fetch `/api/sites`; instead, it imports `MASTER_SITES` directly from `src/data/sites.ts` for map site markers and detail panels. `/api/sites` exists as a route and should be the API seam if this direct import is later replaced.

### Map

`src/components/CommandMap.tsx` renders MapLibre in the browser only.

Current map behavior:

- Base style is `https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json`.
- The component adds a controlled low-opacity country/state label layer from the Carto source.
- Data arrays are converted into GeoJSON sources for each security layer.
- Site markers are created from `sitesData` / `MASTER_SITES` and include marker properties such as worst status, status color, activity volume, and marker radius.
- Site marker color is based on worst domain status.
- Site marker size is based on a clamped activity-volume calculation.
- Site labels appear at `minzoom: 8`.
- Critical sites get a pulsing layer.
- Clicking a site calls the parent `onSiteClick` and triggers a fly-to.

### Left domain panel

`src/components/LayerPanel.tsx` renders grouped domain toggles.

- It filters out the `DISPLAY` group from the visible panel.
- Rows can show either global counts from fetched API arrays or selected-site counts from `selectedSite.domains.*`.
- It uses `GlassPanel` with the `left` variant.
- Toggle state is stored in `activeLayers` in `page.tsx` and passed to `CommandMap` for layer visibility.

### Right-side panels

When no site is selected:

- Search/share controls render in the right HUD.
- `LiveAlerts` renders as a standalone right-side panel from `/api/news` data.

When a site is selected:

- The standalone right HUD is hidden.
- `SiteDetailPanel` is the only right-side surface.
- `SiteDetailPanel` shows site identity, posture hero, critical attention, full domain breakdown, asset detail tabs, recent activity, and site-scoped live alerts.

### Filters / navigation

Implemented filters and controls are UI-local state:

- `activeLayers` controls map layer visibility.
- `selectedSiteId` scopes KPIs and opens the site detail panel.
- URL parameters persist approximate map lat/lon/zoom and active layers.
- Keyboard shortcuts include Escape to clear the selected site, `f` fullscreen, `l` layer panel, `i` intel panel, `r` reset, and `g` projection toggle.

## 7. Video-wall mode

The requested video-wall architecture is **not implemented in this repository**.

Expected items that are absent from the current file tree:

- No `src/app/wall/[slot]/page.tsx` or any `/wall/[slot]` route.
- No `src/app/control/page.tsx` operator surface.
- No `src/components/wall/*` directory.
- No `WallViews.tsx`, `ViewRenderer.tsx`, or `ControlSurface.tsx` files.
- No `src/app/api/wall/stream/route.ts` SSE endpoint.
- No `src/app/api/wall/state/*` mutation endpoints.
- No wall sync store file for `screenAssignments`, `filters`, `version`, draft/live state, or slot assignment.
- No kiosk/browser launch script.
- No Recharts dependency, despite the prompt mentioning chart warnings from another codebase/branch.

Therefore these requested implementation details do not currently exist and cannot be accurately documented as current architecture:

- six `/wall/[slot]` screens
- `/control` operator surface
- shared wall state shape (`screenAssignments`, `filters`, `version`, etc.)
- server-sent event sync from `/api/wall/stream`
- HTTP POST wall mutation endpoints
- stage-then-push draft/live model
- one local PC driving six kiosk Chrome windows
- in-memory Node wall state

If this project needs video-wall mode, it should be added as a new feature. A likely architecture would be:

```text
/control operator UI
  ├─ edits draft wall state
  └─ POST /api/wall/state/... mutations
         │
         ▼
  in-memory wall state store in Node process
         │
         ├─ increments version
         └─ broadcasts SSE
                │
                ▼
/wall/1 ... /wall/6 kiosk clients
  └─ EventSource('/api/wall/stream') receives live state
```

But that is a proposed design sketch, not current code.

## 8. The eight wall views

No wall view components exist in this checkout. There are no eight wall views to list from actual code.

Implemented non-wall view/panel components are:

| File | Purpose |
|---|---|
| `src/components/CommandMap.tsx` | MapLibre map, layer sources, site markers, popups, fly-to handling |
| `src/components/LayerPanel.tsx` | Left domain toggle panel with counts/status dots |
| `src/components/SiteDetailPanel.tsx` | Selected-site detail surface |
| `src/components/LiveAlerts.tsx` | Standalone global alerts feed when no site is selected |
| `src/components/IntelFeed.tsx` | Activity/intel feed panel |
| `src/components/SearchBar.tsx` | Local search/locate UI |
| `src/components/SharePanel.tsx` | Share/copy URL panel |
| `src/components/ViewPresets.tsx` | Preset navigation controls |
| `src/components/GlobalStatusBar.tsx` | Bottom four-metric status strip |
| `src/components/ScaleBar.tsx` | Map scale readout |
| `src/components/KeyboardShortcuts.tsx` | Keyboard shortcut overlay |
| `src/components/ErrorBoundary.tsx` | Client error boundary |

## 9. API routes

All API route handlers live under `src/app/api/*/route.ts`. All current API routes return fictional/demo JSON. There are no wall sync API routes.

### Domain data routes

| Route | Domain / UI use | Response keys | Current data source / dependencies |
|---|---|---|---|
| `/api/flights` | Exposure Findings | `exposure_sites`, `total`, `timestamp` | local generated mock arrays; no external dependency |
| `/api/cyber-threats` | App Assurance | `assurance_events`, `stats`, `total`, `timestamp` | local mock array; no external dependency |
| `/api/earthquakes` | Architecture Reviews | `arch_sites`, `total`, `timestamp` | local mock array; no external dependency |
| `/api/maritime` | Data Loss Prevention | `dlp_sites`, `dlp_events`, `dlp_chokepoints`, totals, `timestamp` | local mock arrays; no external dependency |
| `/api/fires` | OT Asset Registry | `ot_assets`, `total`, `timestamp` | generated mock points using `Math.random()`; `dynamic = 'force-dynamic'`; no external dependency |
| `/api/cctv` | IT Asset Registry | `it_assets`, `total`, `timestamp` | generated mock points using jitter; no external dependency |
| `/api/news` | Awareness Reach and activity/intel feeds | `news`, `total`, `timestamp` | local mock array; no external dependency |
| `/api/weather` | Simulated Campaigns | `campaign_events`, `total`, `timestamp` | local mock array; no external dependency |
| `/api/gdelt` | Access Recertification | `access_events`, `total`, `timestamp` | local mock array; `dynamic = 'force-dynamic'`; no external dependency |
| `/api/satellites` | App Governance | `governance_apps`, `total`, `timestamp` | local mock array; no external dependency |
| `/api/live-news` | Activity Retention | `retention_sites`, `total`, `timestamp` | local mock array; no external dependency |

### Supporting routes

| Route | Purpose | Response keys | Current data source / dependencies |
|---|---|---|---|
| `/api/country-risk` | Global/domain posture scores | `posture_score`, `domains`, `exchanges`, `countries`, `open_exchanges`, `timestamp` | local mock domain scores; no external dependency |
| `/api/sites` | Full site registry | `sites`, `total`, `timestamp` | imports `MASTER_SITES`; optional `?id=` filter |
| `/api/health` | Demo health/platform status | `platform`, `status`, `endpoints`, `timestamp` | local mock endpoint list |
| `/api/region-dossier` | Placeholder region dossier | `location`, `country`, `summary`, `risk_level`, `timestamp` | demo placeholder only; no current external fetch |

### Wall sync routes

None exist. There is no `/api/wall/stream`, no `/api/wall/state/filters`, and no `/api/wall/state/assignments` route in this checkout.

### Middleware/proxy

`src/proxy.ts` applies an in-memory rate limit to `/api/:path*` requests. It sets rate limit response headers and returns a 429 after 100 requests per minute per detected IP. This state is process/isolate-local and is not shared across multiple server instances.

## 10. Key files and where things live

| Path | Role |
|---|---|
| `src/app/page.tsx` | Main single-screen dashboard client component; data fetching, UI state, map/panel composition |
| `src/app/layout.tsx` | Metadata, viewport, providers, global error boundary wrapper |
| `src/app/globals.css` | Tailwind imports, design tokens, palette, glass-panel CSS, global HUD/map styles |
| `src/app/api/*/route.ts` | API-route seam returning domain/supporting JSON |
| `src/components/CommandMap.tsx` | MapLibre map and all GeoJSON source/layer rendering |
| `src/components/LayerPanel.tsx` | Domain layer toggle panel |
| `src/components/SiteDetailPanel.tsx` | Selected-site details, domain breakdown, asset tabs, recent activity, live alerts |
| `src/components/GlobalStatusBar.tsx` | Bottom global metrics strip |
| `src/components/LiveAlerts.tsx` | Standalone global alerts panel when no site is selected |
| `src/components/ui/glass-panel.tsx` | Shared `GlassPanel` wrapper around the local shadcn `Card` primitive |
| `src/components/ui/*` | Local shadcn/Radix-style primitives |
| `src/data/sites.ts` | `SiteRecord` types and `MASTER_SITES` fictional site registry |
| `src/data/layerMap.ts` | Layer display/API/key mapping, `LAYER_GROUPS`, `LAYER_MAP`, `DEFAULT_ACTIVE_LAYERS` |
| `src/lib/time-format.ts` | Deterministic UTC time formatting helper |
| `src/lib/ssrf-guard.ts` | SSRF host validation, safe fetch, and route-level rate-limit helpers |
| `src/lib/utils.ts` | `cn()` class-name helper |
| `src/proxy.ts` | API rate limiting middleware/proxy |
| `next.config.ts` | Next standalone output, MapLibre transpilation, image config, build TypeScript behavior |
| `Dockerfile` | Multi-stage Node 22 Alpine standalone build/runtime image |
| `docker-compose.yml` | Local container wrapper for the Dockerfile |
| `vercel.json` | Vercel function duration config for API route files |

## 11. Deployment

### Docker / Node standalone deployment

The included `Dockerfile` builds and runs the app as a Next standalone Node service:

1. `deps` stage: `npm ci`
2. `builder` stage: copy `node_modules`, copy source, run `npm run build`
3. `runner` stage: copy `public`, `.next/standalone`, `.next/static`, run `node server.js` as non-root `nextjs`

The runtime listens on port `3000` with `HOSTNAME=0.0.0.0`.

`docker-compose.yml` builds the same Dockerfile and maps `${PORT:-3000}:3000`.

### Render deployment

There is no `render.yaml` in the repository. If deployed to Render, this app must be a Node web service (or Docker web service) rather than a static site because it depends on Next route handlers under `/api/*`. The current app does not implement SSE or wall state, but route handlers and the standalone server still require a server runtime.

### Vercel deployment

`vercel.json` configures `src/app/api/**/*.ts` functions with `maxDuration: 30`. `src/proxy.ts` rate-limit state is in-memory and per isolate/process, so it is not a globally consistent distributed rate limiter.

### Intended local kiosk/video-wall deployment

No kiosk launch script or video-wall route exists in this checkout. There is no implemented one-PC/six-Chrome-window wall deployment model to run. If wall mode is added later with in-memory state, it should be deployed as a single Node server instance; multi-instance deployments would require Redis/KV/pub-sub or another shared state backend to keep wall clients synchronized.

## 12. Constraints and invariants

These rules should hold for future changes:

1. **Disguised data only.** Do not add real company, facility, program, or site names. Current names are generic demo labels.
2. **Preserve the `SiteRecord` shape unless all consumers are updated.** `CommandMap`, `SiteDetailPanel`, `LayerPanel`, `GlobalStatusBar`, and `/api/sites` depend on the current shape.
3. **Preserve API response shapes.** The client expects exact keys such as `exposure_sites`, `assurance_events`, `dlp_events`, `retention_sites`, `posture_score`, and `sites`.
4. **Keep the API-route seam.** The client should continue to fetch `/api/*` routes rather than directly calling future data stores or ADF/store endpoints.
5. **Enterprise totals should be computed.** Do not introduce magic global totals that can drift from site/domain arrays.
6. **Keep `src/data/layerMap.ts` as the layer mapping authority.** Layer keys, labels, groups, and API route mappings should remain centralized there.
7. **No external security data calls in demo mode.** Current domain routes return local fictional data. Map tiles and Google Fonts are external presentation dependencies; region dossier is currently a placeholder and does not fetch externally.
8. **Keep `src/lib/ssrf-guard.ts` intact.** If future routes accept user-supplied URLs/hosts and make outbound calls, use `validateHost`/`safeFetch`/rate-limit helpers.
9. **Be explicit about process-local state.** Existing proxy rate limiting is in-memory and per process/isolate. Any future wall state implemented in memory would have the same single-instance limitation.
10. **Do not paper over missing wall features.** Current code has no wall routes, wall sync, or wall views; add them deliberately if required.

## Current inconsistencies / half-implemented areas

- The prompt/product language references video-wall mode, `/control`, `/wall/[slot]`, SSE sync, and eight wall views, but none of those files/routes exist in this repository.
- `README.md` lists `Posture Index` as one of the 12 displayed layers, while `layerMap.ts` lists `day_night` as the 12th `LayerDef`; `posture_index` exists in `SiteRecord.domains` but is not a map layer definition.
- `layerMap.ts` still stores legacy color hex values even though the UI has been refactored toward strict CSS palette tokens.
- `page.tsx` imports `MASTER_SITES` directly for site markers/details instead of fetching `/api/sites`; this is convenient for demo mode but bypasses the route seam for site registry data.
- `next.config.ts` has `typescript.ignoreBuildErrors: true`, so `next build` may succeed even with TypeScript errors. A separate type-check command should be used in CI if type safety is required.
- `src/proxy.ts` and several API routes use process-local in-memory state or randomization. That is acceptable for demo data/rate limiting but should be revisited for deterministic production behavior.
