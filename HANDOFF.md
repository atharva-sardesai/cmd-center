# Sentinel Command Center — Handoff Document

> **Purpose of this file:** Written for a downstream coding agent (Codex) to continue development, and for a reviewer to audit Codex's changes. Every claim below was verified against the live codebase. If you find a discrepancy, trust the code, not this file.

---

## 1. Project Purpose

**Sentinel Command Center** is a single-pane security program situational-awareness dashboard for security leadership. It shows 28 global sites on a 3-D MapLibre globe and aggregates 12 security domains into color-coded activity layers, per-site scorecards, and a live activity feed.

**What it IS:**  
A reporting tool. It renders the output of other security tools — scan findings, DLP incidents, phishing campaign results, access-review status, asset inventories, log-retention coverage — on a single map, per site, per domain. The posture scores are indexes, not detections.

**What it is NOT:**  
Not a SIEM. Not a detection engine. Not connected to any real data source in demo mode. All data is fictional placeholder data generated in local API routes.

**Running it:**  
```
npm install && npm run dev        # default port 3000
npm run build                     # production build — must stay clean
```
No API keys, no environment variables required in demo mode.

---

## 2. Architecture & Stack

```
src/
  app/
    page.tsx              ← single page; fetches all domain data; owns all map state
    layout.tsx            ← metadata, fonts, no analytics
    globals.css           ← CSS custom properties, glassmorphism system
    api/                  ← 29 Next.js route handlers (see §2.2)
  components/             ← all UI components
  data/
    layerMap.ts           ← SINGLE SOURCE OF TRUTH for layer key ↔ display-name mapping
    sites.ts              ← SINGLE SOURCE OF TRUTH for per-site mock data (28 sites)
  lib/
    ssrf-guard.ts         ← SSRF validation + rate limiter (DO NOT DELETE)
  middleware.ts           ← Next.js proxy middleware
```

**Stack versions (from package.json):**
| Package | Version |
|---|---|
| next | 16.2.6 (App Router) |
| react | 19.2.4 |
| typescript | ^5 |
| maplibre-gl | ^5.24.0 |
| framer-motion | ^12.38.0 |
| tailwindcss | ^4 |
| lucide-react | ^1.14.0 |

> ⚠ **Next.js 16 is not the Next.js in training data.** APIs, conventions, and file structure differ. Always read `node_modules/next/dist/docs/` before writing Next.js-specific code (per `AGENTS.md`).

### 2.1 Key architectural seam

```
page.tsx (client)
  ↓ fetch('/api/<route>')          ← always via Next.js routes, never direct
  ↓ json response in fixed shape
  ↓ stored in dataRef.current
  ↓ passed as `data` prop to OsirisMap
  ↓ OsirisMap converts to GeoJSON → MapLibre sources
```

The frontend **never knows** the data source. Every `/api/*` route body begins with:
```ts
// DEMO MOCK — returns fictional data. In production, replace this body
// with the real backend fetch; the response shape is unchanged.
```
To connect live data: replace the route body. Response shape must stay identical.

### 2.2 API routes

| Route | Domain layer key | Response key(s) used by UI |
|---|---|---|
| `/api/flights` | `exposure` | `exposure_sites[]` |
| `/api/cyber-threats` | `app_assurance` | `assurance_events[]`, `stats.active_cves` |
| `/api/earthquakes` | `arch_reviews` | `arch_sites[]` |
| `/api/maritime` | `dlp` | `dlp_sites[]`, `dlp_events[]`, `dlp_chokepoints[]` |
| `/api/fires` | `ot_assets` | `ot_assets[]` |
| `/api/cctv` | `it_assets` | `it_assets[]` |
| `/api/news` | `awareness` (+ activity feed) | `news[]` |
| `/api/weather` | `sim_campaigns` | `campaign_events[]` |
| `/api/gdelt` | `access_recert` | `access_events[]` |
| `/api/satellites` | `app_governance` | `governance_apps[]` |
| `/api/live-news` | `activity_retention` | `retention_sites[]` |
| `/api/country-risk` | posture index / GlobalStatusBar | `posture_score`, `domains[]`, `exchanges[]` |
| `/api/sites` | site marker layer + SiteDetailPanel | `sites[]` (full SiteRecord[]) |
| `/api/health` | — | `platform`, `status` |
| `/api/sentinel` | — | sentinel status payload |
| `/api/region-dossier` | right-click dossier | Nominatim reverse-geocode + country data |
| `/api/markets` | unused by current UI | — |
| `/api/frontlines` | unused by current UI | — |
| `/api/space-weather` | unused by current UI | — |
| `/api/infrastructure` | unused by current UI | — |
| `/api/scanner` | OSINT panel (stubbed) | 503 |
| `/api/osint/*` (8 routes) | OSINT panel (stubbed) | 503 |

---

## 3. The Data Contract ← most important section

**Do not change these shapes.** The frontend hard-codes field access against them. Every change to a response shape must be accompanied by a matching update to the consuming component.

### 3.1 `SiteRecord` — `src/data/sites.ts`

```typescript
export type StatusLevel = 'HEALTHY' | 'WATCH' | 'CRITICAL';
export type SevLevel    = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DomainData {
  score:  number;    // 0–100, higher = better posture
  trend:  number;    // signed int: positive = improving, negative = degrading
  status: StatusLevel;
}

export interface SiteRecord {
  id:           string;  // kebab-case: 'north-hub', 'india-plant-4', etc.
  name:         string;  // display: 'North Hub', 'India Plant 4'
  lat:          number;  // WGS-84 decimal
  lng:          number;
  region:       string;  // 'EMEA' | 'AMER' | 'LATAM' | 'APAC' | 'MEA'
  businessUnit: string;  // 'Corporate' | 'Manufacturing' | 'R&D' | 'Engineering' | etc.
  postureScore: number;  // 0–100 composite; same as domains.posture_index.score

  domains: {
    exposure: DomainData & {
      findings:  number;   // total open findings count
      criticals: number;   // subset that are critical severity
      severity:  SevLevel; // worst-case severity label
    };
    app_assurance: DomainData & {
      findings:  number;   // open findings from SAST/DAST/pen test
      openTests: number;   // number of tests in-progress or not-closed
    };
    arch_reviews: DomainData & {
      completed: number;   // completed reviews
      scheduled: number;   // upcoming / in-progress reviews
      type:      string;   // e.g. 'Cloud Platform', 'OT Network Segment'
    };
    dlp: DomainData & {
      policies:  number;   // active DLP policy rules
      incidents: number;   // incidents in period
    };
    ot_assets: DomainData & {
      plcs:  number;       // PLC count
      hmis:  number;       // HMI count
      scada: number;       // SCADA node count
    };
    it_assets: DomainData & {
      servers:   number;
      endpoints: number;
      network:   number;   // network devices
      cloud:     number;   // cloud workloads
    };
    awareness: DomainData & {
      completion_pct: number;  // 0–100
      trained:        number;  // staff who completed training
      total:          number;  // total staff
    };
    sim_campaigns: DomainData & {
      click_rate: number;  // phishing click-through rate (whole number %)
      sent:       number;  // emails sent in last campaign
      clicked:    number;  // emails clicked
    };
    access_recert: DomainData & {
      overdue:    number;  // overdue recertification records
      total_users: number; // total users in scope
    };
    app_governance: DomainData & {
      compliant:    number;
      review_due:   number;
      non_compliant: number;
    };
    activity_retention: DomainData & {
      coverage_pct:  number;   // 0–100
      days_retained: number;   // actual days retained (target = 180)
    };
    posture_index: DomainData;  // composite score; no extra fields
  };

  recentActivity: Array<{
    time:     string;    // ISO 8601
    type:     string;    // e.g. 'scan', 'patch', 'alert', 'access', 'aware', 'dlp'
    title:    string;    // one-line human-readable description
    severity: SevLevel;
  }>;
}
```

**Invariant — enterprise totals are computed, never stored:**  
`page.tsx` computes global KPI counts directly from the domain route data arrays (e.g. `data.exposure_sites.length`). Site-scoped KPIs derive from `selectedSite.domains.*`. There is no separately stored total field anywhere — Codex must not add one.

**28 sites in `MASTER_SITES`:**
- 13 non-India sites: North Hub (EMEA), EMEA Node (EMEA), Nordic Site (EMEA), Central Hub (AMER), West Coast Hub (AMER), Midwest Node (AMER), Southeast Hub (AMER), LATAM Node (LATAM), APAC Site 1 (APAC), APAC Site 2 (APAC), APAC Site 3 (APAC), South Hub (APAC), MEA Node (MEA)
- 15 India sites: India Hub 1–2–5–6–8–12–15, India Plant 2–4–7–10–13, India Node 3–6–9–11–14 ← all generic labels, no real city names

### 3.2 `src/data/layerMap.ts` — layer key ↔ display mapping

This file is the **sole source of truth** for:
- layer `key` (used in `activeLayers` state object)
- `label` (shown in LayerPanel)
- `description` (tooltip)
- `color` (hex accent)
- `dataKeys` (keys on `data` object used by LayerPanel entity counter)
- `apiEndpoint` (which `/api/*` route provides data for this layer)
- `group` (panel section grouping)

**Never define layer labels, colors, or keys anywhere else.** `LayerPanel`, `OsirisMap`, and `page.tsx` all import from this file.

Exports: `LAYER_GROUPS`, `LAYER_MAP` (O(1) by key), `ALL_LAYERS` (flat), `DEFAULT_ACTIVE_LAYERS`.

The 12 domain keys are:  
`exposure`, `app_assurance`, `arch_reviews`, `dlp`, `ot_assets`, `it_assets`, `awareness`, `sim_campaigns`, `access_recert`, `app_governance`, `activity_retention`, `day_night`

### 3.3 Domain route response shapes (abbreviated)

Only the fields the frontend consumes are listed. Extra fields in the response are ignored.

```
/api/flights     → { exposure_sites: Array<{ lat, lng, name, region, findings, criticals, severity, score }> }
/api/cyber-threats → { assurance_events: Array<{ lat, lng, name, app, findings, severity, status }>, stats: { active_cves } }
/api/earthquakes → { arch_sites: Array<{ lat, lng, name, type, status, score, magnitude, place }> }
/api/maritime    → { dlp_sites: Array<{lat,lng,name,type,country,policies}>, dlp_events: Array<{lat,lng,name,severity}>, dlp_chokepoints: Array<{lat,lng,name,traffic,risk}> }
/api/fires       → { ot_assets: Array<{ lat, lng, site, category, criticality }> }
/api/cctv        → { it_assets: Array<{ lat, lng, site, category, total_assets }> }
/api/news        → { news: Array<{ title, source, risk_score, published, coords: [lat, lng] }> }
/api/weather     → { campaign_events: Array<{ lat, lng, title, click_rate, sent, clicked, severity }> }
/api/gdelt       → { access_events: Array<{ lat, lng, name, overdue, dept, severity }> }
/api/satellites  → { governance_apps: Array<{ lat, lng, name, status, risk, findings, color }> }
/api/live-news   → { retention_sites: Array<{ lat, lng, name, coverage_pct, days_retained, status }> }
/api/country-risk → { posture_score: number, domains: Array<{ key, label, score, trend, status }>, exchanges: [...], countries: [...] }
/api/sites       → { sites: SiteRecord[], total: number, timestamp: string }
```

---

## 4. Conventions Codex Must Follow

### 4.1 File / folder structure
- All API routes live in `src/app/api/<name>/route.ts` (one file per route).
- All UI components live in `src/components/*.tsx` (flat, no subdirectory structure yet).
- Data/type modules live in `src/data/*.ts`.
- Security utilities live in `src/lib/*.ts`.

### 4.2 API route pattern
Every route must follow this exact pattern:
```ts
// DEMO MOCK — returns fictional data. In production, replace this body
// with the real backend fetch; the response shape is unchanged.

import { NextResponse } from 'next/server';
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function GET() {
  await delay(300 + Math.random() * 500);  // 300–800 ms simulated latency
  try {
    // ... compute response ...
    return NextResponse.json(
      { ...payload, timestamp: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch {
    return NextResponse.json({ ...emptyPayload }, { status: 500 });
  }
}
```
- Delay is random within 300–800 ms range (simulates real latency).
- Always include `timestamp` in response.
- Always include `Cache-Control` header.
- Always have an empty-payload catch branch.
- For routes that need to disable caching (e.g. fires): `export const dynamic = 'force-dynamic';`

### 4.3 No real names — anywhere
This is absolute. No real company names, product names, internal program names, city names in site labels, or system names in:
- Source code (including comments)
- Mock data strings (titles, descriptions, labels)
- Commit messages
- `README.md`, `HANDOFF.md`, or any other doc file in the repo

Specifically: site labels must be generic (`India Hub 1`, `EMEA Node`) — never real facility names or cities. Activity feed items must describe fictional events. Use `// fictional ...` comments when clarification is needed about why data looks a certain way.

### 4.4 TypeScript
- Strict mode is on. No `any` in new component props if it can be typed.
- Import types with `import type { ... }` when only used as types.
- The `SiteRecord` and `DomainData` types in `src/data/sites.ts` are the authoritative domain types — use them, don't redefine.

### 4.5 Component conventions
- Components that use browser APIs or MapLibre must be `'use client'`.
- Heavy components (OsirisMap, LayerPanel) are `memo()`-wrapped to prevent spurious re-renders.
- Framer Motion `AnimatePresence` wraps all enter/exit animations.
- Design system: glassmorphism via `.glass-panel` / `.glass-panel-sm` CSS classes; accent color is `var(--cyan-primary)` (#00E5FF); status colors: green #00E676, yellow #FFD700, red #FF3D3D.
- Font: JetBrains Mono (mono), Inter (sans) — both loaded from Google Fonts CDN.

### 4.6 `src/lib/ssrf-guard.ts`
**Must not be deleted or weakened.** Import `validateHost` / `safeFetch` / `isRateLimited` in any route that takes a user-supplied host and makes an outbound call (e.g. `/api/region-dossier`, OSINT routes).

### 4.7 Commit message style
Observed pattern in history: short present-tense imperative, no period, no ticket refs.  
Examples: `add site detail panel`, `expand India site count to 15`, `throttle mousemove to 300ms`

---

## 5. What's Done / What's Next

### ✅ Done and working (verified by `npm run build` passing with 31 routes)

- **Full map UI** — MapLibre globe, 12 security domain layers with GeoJSON sources and click popups
- **LayerPanel** — grouped layer toggles, entity counts from `data`, sourced entirely from `layerMap.ts`
- **All 17 domain API routes** mocked with fictional data, simulated delays, correct response shapes
- **28 site registry** in `src/data/sites.ts` — 13 non-India + 15 India sites, full `SiteRecord` with 12-domain data each
- **Site marker layer** in OsirisMap — `sites` GeoJSON source with 4 layers (glow, dot, selection ring, label), colored by posture status, sized by score
- **SiteDetailPanel** (`src/components/SiteDetailPanel.tsx`) — slide-in panel, 12 domain posture bar chart, IT/OT/retention grids, recent activity; Escape + × close
- **Site selection flow** — clicking a site marker: fires `onSiteClick`, calls `flyTo` (zoom 6, 1100 ms, ease-in-out), opens SiteDetailPanel, shows "VIEWING: <Site> ✕" chip, re-scopes 5 KPIs to per-site values
- **"VIEWING" chip** — top-center, AnimatePresence, ✕ clears back to global
- **KPI bar re-scope** — both desktop and mobile KPI grids switch from global array counts to `selectedSite.domains.*` when a site is selected
- **`/api/sites` route** — returns `MASTER_SITES` with optional `?id=` filter
- **India sites in domain layer routes** — `flights` (exposure), `cctv` (IT assets), `fires` (OT assets) all updated with 14 new India site entries; "India Site" renamed to "India Hub 1" in all three
- **Smoother map** — dragPan inertia enabled, mousemove throttle 300 ms, flyTo uses ease-in-out
- **GlobalStatusBar** — scrolling ticker with domain scores and posture index
- **IntelFeed / LiveAlerts / SearchBar / SharePanel / ViewPresets / KeyboardShortcuts / ScaleBar** — all working
- **SSRF guard** intact at `src/lib/ssrf-guard.ts`
- **Zero external network calls** in mock mode (CDN exceptions: CartoDB tiles, Nominatim geocode, Google Fonts — documented in README)
- **No real company/facility names** anywhere in code or data

### 🔲 Not done / likely-next tasks (each is independently pickable)

**P1 — Data completeness**

1. **Expand India sites to remaining domain routes** — `maritime` (DLP), `gdelt` (access recert), `weather` (sim campaigns), `news` (awareness/activity feed), `live-news` (retention), `earthquakes` (arch reviews), `satellites` (app governance), `cyber-threats` (app assurance) still only have the original 14 sites. The 14 new India sites don't appear in those map layers. Pattern: copy the India site entry list from `flights/route.ts` into each remaining route with plausible per-domain values.

2. **Activity feed site filtering** — `LiveAlerts` currently shows global `data.news` items regardless of selected site. When `selectedSiteId` is set, filter `news` items to those with `coords` within ~200 km of the selected site's lat/lng. The distance formula is already available (haversine or simple degree-distance approximation).

**P2 — UI polish**

3. **Mobile SiteDetailPanel** — The panel wrapper uses `desktop-panel` class, so it's hidden on mobile. Add a mobile treatment: when a site is selected on mobile, show the detail panel as a bottom-sheet (same pattern as the existing `AnimatePresence` mobile drawer in `page.tsx`, initial `y: '100%'`).

4. **Double flyTo on site click** — `OsirisMap.tsx` line ~68: the `onSiteClickRef.current` callback calls `mapRef.current?.flyTo(...)` immediately, and the parent also calls `setFlyToLocation(...)` which triggers the flyTo effect a second time (same destination). Refactor: remove the `mapRef.current?.flyTo(...)` call from `onSiteClickRef` and let the parent's `flyToLocation` prop drive all fly-to transitions.

5. **Posture score ring on site marker** — The site-dots layer is a filled circle colored by status. Consider replacing with a ring (stroke-only) so domain layer dots underneath (exposure, IT, OT) remain visible through it. Use `circle-opacity: 0` + `circle-stroke-width: 2` + `circle-stroke-color: [status color]`.

**P3 — Features**

6. **Region dossier per site** — Right now right-click fires the region dossier which Nominatim-reverse-geocodes the click point. When `selectedSiteId` is set and the user right-clicks, pre-fill with the selected site's SiteRecord data instead of making a Nominatim call.

7. **Export / share per-site report** — SharePanel currently shares a map URL. Add a "Copy site report" button inside SiteDetailPanel that formats the site's SiteRecord as a concise markdown or JSON snippet and copies to clipboard.

8. **Dead-code cleanup** — `src/components/CameraViewer.tsx` and `src/components/MarketsPanel.tsx` are not imported by any current component. Remove or move to an `_unused/` folder.

9. **Unused routes** — `/api/markets`, `/api/frontlines`, `/api/space-weather`, `/api/infrastructure` are not consumed by the current UI. Either wire them to new display layers or document them as stubs.

---

## 6. Guardrails — What Codex Must NOT Do

| # | Rule | Reason |
|---|---|---|
| G1 | **Do not alter SiteRecord shape** | `SiteDetailPanel`, `OsirisMap` (sites GeoJSON features), and `page.tsx` KPI re-scope all hard-reference every field. Adding/removing/renaming a field without updating all consumers will break the UI silently. |
| G2 | **Do not change API route response shapes** | The seam between routes and the frontend is intentionally rigid. Both sides must evolve together. |
| G3 | **Do not add external network calls in demo mode** | All domain data comes from local `/api/*` routes. Do not add `fetch('https://...')` calls inside routes or components. The only CDN calls allowed are map tiles, Nominatim (hover geocode), and Google Fonts — all already present. |
| G4 | **Do not delete or weaken `src/lib/ssrf-guard.ts`** | It protects the OSINT and dossier routes from SSRF. If you add new proxy routes, import and use it. |
| G5 | **Do not introduce real names** | No real company, product, facility, or city names in site labels, activity feed text, comments, or commit messages. Generic labels only. |
| G6 | **Do not hardcode enterprise totals** | The KPI bar and GlobalStatusBar totals must always be computed from live data arrays or SiteRecord fields. No magic constants. |
| G7 | **Do not add layer keys outside `layerMap.ts`** | Adding a display layer requires: (1) adding a `LayerDef` to `LAYER_GROUPS`, (2) adding the GeoJSON source in `OsirisMap.tsx`, (3) adding the fetch in `page.tsx`. All three must happen together. |
| G8 | **Do not remove the DEMO MOCK comment from routes** | Every route body must start with the standard comment block. It is the signal a route is a mock, not live. |
| G9 | **Flag ambiguity; don't guess** | If a task description is unclear about whether it requires changing the data contract, breaking the seam, or adding a new layer key, stop and ask a human reviewer before proceeding. |

---

## 7. Audit Checklist

Run this against any Codex diff before merging.

### Data contract integrity
- [ ] `SiteRecord` interface in `src/data/sites.ts` unchanged (no fields added, removed, or renamed)?
- [ ] All 28 sites still present in `MASTER_SITES` with non-null values on all 12 domain fields?
- [ ] `src/data/layerMap.ts` is still the sole definition of layer keys, labels, colors, and `dataKeys`?
- [ ] Enterprise totals in the KPI bar computed from data arrays — not hardcoded constants?
- [ ] Per-site KPIs when site selected read from `selectedSite.domains.*` — not from separate stored fields?

### API route contract
- [ ] All 29 routes still return their documented response shapes (§3.3)?
- [ ] Each route body starts with the standard `// DEMO MOCK` comment?
- [ ] Each route has `await delay(...)`, a `try/catch`, and the `Cache-Control` header?
- [ ] No new `fetch('https://...')` calls inside any route or component (except map tiles, Nominatim, Google Fonts)?

### No real names
- [ ] Grep `src/` for any real company names, product names, internal program names: `git diff | grep -i '<known-name>'` returns empty?
- [ ] All site labels in `MASTER_SITES`, `flights`, `cctv`, `fires` routes are generic (`India Hub 1`, `EMEA Node`, etc.)?
- [ ] Activity feed titles in `/api/news` remain fictional?

### Security
- [ ] `src/lib/ssrf-guard.ts` file unchanged?
- [ ] Any new proxy route that takes a user-supplied host imports `validateHost` or `safeFetch`?

### Build health
- [ ] `npm run build` exits 0 with "Compiled successfully" and no TypeScript errors?
- [ ] Route count is ≥ 31 (one new route may be added; count should not decrease)?
- [ ] No new `any` types introduced in component props where the shape is known?

### MapLibre layer hygiene
- [ ] Every new GeoJSON source registered in `SOURCES` array inside the `map.on('load', ...)` callback?
- [ ] Every new layer has a corresponding entry in the `setVis([...], ...)` calls in the layer-visibility `useEffect`?
- [ ] Site marker layers (`sites-glow`, `sites-dots`, `sites-ring`, `sites-label`) still present?

### State management
- [ ] `selectedSiteId` drives the SiteDetailPanel (truthy = panel open)?
- [ ] Clearing selection (✕ chip, Escape, or `setSelectedSiteId(null)`) resets KPIs to global values?
- [ ] `flyToLocation` is the only mechanism that triggers `map.flyTo` for user navigation (no second call in `onSiteClickRef`)?

---

*Generated 2026-05-28. Reflects codebase state after the three-change feature set (Site Detail Panel, 15 India Sites, Smoother Map). Build: ✓ Compiled successfully, 31 routes.*
