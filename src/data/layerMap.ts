/**
 * layerMap.ts — single source of truth for all Sentinel Command Center layer definitions.
 *
 * Import LAYER_GROUPS and LAYER_MAP from here.  Never define a layer label or key
 * anywhere else in the UI — LayerPanel, CommandMap, and page.tsx all reference this file.
 *
 * The API endpoint listed for each layer is the /api/* route whose mock body populates
 * the corresponding dataKeys.  To connect live data, replace that route's body; the
 * response shape must remain unchanged.
 */

import {
  ShieldAlert, ShieldCheck, Users, Lock,
  Building2, Server, Cpu, Mail,
  AppWindow, KeyRound, Database, Sun,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface LayerDef {
  key: string;           // activeLayers state key
  label: string;         // display label in UI
  description: string;   // tooltip / panel description
  color: string;         // hex accent color
  Icon: LucideIcon;
  dataKeys: string[];    // keys on the `data` object used for entity counting
  apiEndpoint?: string;  // /api/* route that populates this layer (undefined = computed)
  group: string;         // panel group label
}

export interface GroupDef {
  label: string;
  Icon: LucideIcon;
  color: string;
  layers: LayerDef[];
}

export const LAYER_GROUPS: GroupDef[] = [
  {
    label: 'VULNERABILITY',
    Icon: ShieldAlert,
    color: '#00E5FF',
    layers: [
      {
        key: 'exposure',
        label: 'Exposure Findings',
        description: 'Open vulnerability findings by site — sized by finding count, coloured by severity.',
        color: '#00E5FF',
        Icon: ShieldAlert,
        dataKeys: ['exposure_sites'],
        apiEndpoint: '/api/flights',
        group: 'VULNERABILITY',
      },
      {
        key: 'app_assurance',
        label: 'App Assurance',
        description: 'Application security test results mapped to application geography.',
        color: '#FF6B00',
        Icon: ShieldCheck,
        dataKeys: ['assurance_events'],
        apiEndpoint: '/api/cyber-threats',
        group: 'VULNERABILITY',
      },
      {
        key: 'arch_reviews',
        label: 'Architecture Reviews',
        description: 'Security architecture review completions and in-progress engagements.',
        color: '#FF9500',
        Icon: Building2,
        dataKeys: ['arch_sites'],
        apiEndpoint: '/api/earthquakes',
        group: 'VULNERABILITY',
      },
    ],
  },
  {
    label: 'DATA & ASSETS',
    Icon: Lock,
    color: '#00BCD4',
    layers: [
      {
        key: 'dlp',
        label: 'Data Loss Prevention',
        description: 'DLP policy enforcement points, active incidents, and high-risk data flows.',
        color: '#00BCD4',
        Icon: Lock,
        dataKeys: ['dlp_sites', 'dlp_events', 'dlp_chokepoints'],
        apiEndpoint: '/api/maritime',
        group: 'DATA & ASSETS',
      },
      {
        key: 'ot_assets',
        label: 'OT Asset Registry',
        description: 'Operational technology inventory: PLCs, SCADA nodes, and ICS endpoints.',
        color: '#76FF03',
        Icon: Cpu,
        dataKeys: ['ot_assets'],
        apiEndpoint: '/api/fires',
        group: 'DATA & ASSETS',
      },
      {
        key: 'it_assets',
        label: 'IT Asset Registry',
        description: 'IT asset inventory: servers, endpoints, cloud workloads, and network devices.',
        color: '#00E676',
        Icon: Server,
        dataKeys: ['it_assets'],
        apiEndpoint: '/api/cctv',
        group: 'DATA & ASSETS',
      },
    ],
  },
  {
    label: 'PEOPLE & ACCESS',
    Icon: Users,
    color: '#D4AF37',
    layers: [
      {
        key: 'awareness',
        label: 'Awareness Reach',
        description: 'Security awareness training completion metrics and active campaign reach.',
        color: '#D4AF37',
        Icon: Users,
        dataKeys: ['news'],
        apiEndpoint: '/api/news',
        group: 'PEOPLE & ACCESS',
      },
      {
        key: 'sim_campaigns',
        label: 'Simulated Campaigns',
        description: 'Phishing simulation results: send volume, click rate, and outcome by site.',
        color: '#E040FB',
        Icon: Mail,
        dataKeys: ['campaign_events'],
        apiEndpoint: '/api/weather',
        group: 'PEOPLE & ACCESS',
      },
      {
        key: 'access_recert',
        label: 'Access Recertification',
        description: 'User access review cycles: overdue certifications and high-risk entitlements.',
        color: '#FF3D3D',
        Icon: KeyRound,
        dataKeys: ['access_events'],
        apiEndpoint: '/api/gdelt',
        group: 'PEOPLE & ACCESS',
      },
    ],
  },
  {
    label: 'GOVERNANCE',
    Icon: AppWindow,
    color: '#448AFF',
    layers: [
      {
        key: 'app_governance',
        label: 'App Governance',
        description: 'Application security governance: risk ratings and policy compliance per app.',
        color: '#B39DDB',
        Icon: AppWindow,
        dataKeys: ['governance_apps'],
        apiEndpoint: '/api/satellites',
        group: 'GOVERNANCE',
      },
      {
        key: 'activity_retention',
        label: 'Activity Retention',
        description: '180-day log retention coverage: sites meeting and missing retention SLA.',
        color: '#448AFF',
        Icon: Database,
        dataKeys: ['retention_sites'],
        apiEndpoint: '/api/live-news',
        group: 'GOVERNANCE',
      },
    ],
  },
  {
    label: 'DISPLAY',
    Icon: Sun,
    color: '#5C8AFF',
    layers: [
      {
        key: 'day_night',
        label: 'Day / Night Cycle',
        description: 'Live solar terminator overlay showing day and night hemispheres.',
        color: '#5C8AFF',
        Icon: Sun,
        dataKeys: [],
        apiEndpoint: undefined,
        group: 'DISPLAY',
      },
    ],
  },
];

// Flat map for O(1) lookup by key
export const LAYER_MAP: Record<string, LayerDef> = Object.fromEntries(
  LAYER_GROUPS.flatMap(g => g.layers).map(l => [l.key, l])
);

// Ordered flat list (used for counts / iteration)
export const ALL_LAYERS: LayerDef[] = LAYER_GROUPS.flatMap(g => g.layers);

// Default activeLayers state (all domain layers on, day_night on)
export const DEFAULT_ACTIVE_LAYERS: Record<string, boolean> = Object.fromEntries(
  ALL_LAYERS.map(l => [l.key, l.key !== 'day_night'])
);
