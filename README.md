# Sentinel Command Center

A single-pane situational-awareness map for security program management.
Displays 12 security domains as live activity layers on a 3D globe.

**All data is fictional placeholder data for demo purposes only.**

---

## What it shows

| Layer | Domain |
|---|---|
| Exposure Findings | Open vulnerability findings by site |
| App Assurance | Application security test results |
| Architecture Reviews | Security architecture review status |
| Data Loss Prevention | DLP enforcement points and incidents |
| OT Asset Registry | Operational technology inventory |
| IT Asset Registry | Server, endpoint, and cloud assets |
| Awareness Reach | Security awareness training completion |
| Simulated Campaigns | Phishing simulation results |
| Access Recertification | User access review cycles |
| App Governance | Application risk and policy compliance |
| Activity Retention | 180-day log retention coverage |
| Posture Index | Composite program health gauge |

---

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No API keys or environment variables are required.
All `/api/*` routes return local mock data with a short simulated delay.

---

## Connecting live data

Every API route body begins with:

```ts
// DEMO MOCK — returns fictional data. In production, replace this body
// with the real backend fetch; the response shape is unchanged.
```

To connect a real backend, replace the route body in `src/app/api/<domain>/route.ts`.
The response shape must remain unchanged — the client and map layers depend on it.

Layer keys and display labels are defined in a single file:
`src/data/layerMap.ts` — edit there and nowhere else.

---

## External dependencies (CDN)

Three external services are used for non-data functions:

| Service | Purpose |
|---|---|
| CartoDB Dark Matter GL tiles | Map background tiles |
| OSM Nominatim | Reverse geocode on mouse hover |
| Google Fonts (JetBrains Mono, Inter) | Typography |

All other data comes from local mock routes. There are no outbound calls to
third-party intelligence, telemetry, market, or live-feed providers.

---

## Tech stack

- **Next.js 16** (App Router, TypeScript 5)
- **MapLibre GL** — GPU-rendered globe with GeoJSON layers
- **Framer Motion** — panel and splash animations
- **Tailwind CSS v4** + custom glassmorphism design system
