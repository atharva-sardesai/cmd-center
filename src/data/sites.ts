// DEMO MOCK — fictional site registry for Sentinel Command Center.
// In production, replace MASTER_SITES with real backend data; SiteRecord shape is unchanged.

export type StatusLevel = 'HEALTHY' | 'WATCH' | 'CRITICAL';
export type SevLevel    = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DomainData {
  score:  number;   // 0–100, higher = better posture
  trend:  number;   // signed integer, positive = improving
  status: StatusLevel;
}

export interface SiteRecord {
  id:           string;
  name:         string;
  lat:          number;
  lng:          number;
  region:       string;
  businessUnit: string;
  postureScore: number;
  deskAnalytics: {
    appClassification: { class1: number; class2: number; class3: number };
    vulnerabilitySeverity: { critical: number; high: number; medium: number; low: number };
    drStatus: { protected: number; atRisk: number; noDr: number };
    compliance: { frameworkA: number; frameworkB: number; frameworkC: number };
  };
  domains: {
    exposure:           DomainData & { findings: number; criticals: number; severity: SevLevel };
    app_assurance:      DomainData & { findings: number; openTests: number };
    arch_reviews:       DomainData & { completed: number; scheduled: number; type: string };
    dlp:                DomainData & {
      policies: number;
      incidents: number;
      blocked: number;
      falsePositives: number;
      escalated: number;
      protocols: Record<'email' | 'https' | 'removable' | 'sync', number>;
      recipientCategories: Record<'aiTools' | 'internal' | 'personalDrive' | 'vendor' | 'partner', number>;
      workerTypes: Record<'employee' | 'contractor' | 'vendor' | 'partner', number>;
      timeline: Array<{ label: string; alerts: number; critical: number; high: number; medium: number; low: number }>;
      topSources: Array<{ name: string; count: number; status: StatusLevel }>;
    };
    ot_assets:          DomainData & { plcs: number; hmis: number; scada: number };
    it_assets:          DomainData & { servers: number; endpoints: number; network: number; cloud: number };
    awareness:          DomainData & { completion_pct: number; trained: number; total: number };
    sim_campaigns:      DomainData & { click_rate: number; sent: number; clicked: number };
    access_recert:      DomainData & { overdue: number; total_users: number };
    app_governance:     DomainData & { compliant: number; review_due: number; non_compliant: number };
    activity_retention: DomainData & { coverage_pct: number; days_retained: number };
    posture_index:      DomainData;
  };
  recentActivity: Array<{
    time:     string;
    type:     string;
    title:    string;
    severity: SevLevel;
  }>;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function ss(n: number): StatusLevel {
  return n >= 80 ? 'HEALTHY' : n >= 65 ? 'WATCH' : 'CRITICAL';
}

function sev(c: number, f: number): SevLevel {
  if (f === 0) return 'LOW';
  const r = c / f;
  return r > 0.15 ? 'CRITICAL' : r > 0.08 ? 'HIGH' : r > 0.03 ? 'MEDIUM' : 'LOW';
}

// Build a SiteRecord from a compact seed.
//   posture: 0–100 overall score
//   expF: exposure finding count   itSv: IT server count   otP: OT PLC count
//   acts: [type, title, severity, hoursAgo]
const DEMO_ACTIVITY_BASE_TIME = Date.UTC(2026, 4, 29, 12, 0, 0);

function build(
  id: string, name: string, lat: number, lng: number, region: string, bu: string,
  posture: number, expF: number, itSv: number, otP: number, archType: string,
  acts: Array<[string, string, SevLevel, number]>,
): SiteRecord {
  const expC     = Math.round(expF * (posture < 70 ? 0.12 : posture < 80 ? 0.07 : 0.04));
  const assF     = Math.round(expF * 0.75);
  const archC    = Math.round(posture / 12) + 3;
  const archS    = Math.max(0, Math.round((100 - posture) / 25));
  const dlpP     = Math.round(itSv / 8) + 4;
  const dlpI     = Math.max(0, Math.round((100 - posture) / 12));
  const dlpBlocked = Math.max(1, Math.round(dlpI * (posture >= 80 ? 0.74 : posture >= 70 ? 0.66 : 0.58)));
  const dlpFalsePositives = Math.max(0, Math.round(dlpI * (posture >= 82 ? 0.08 : posture >= 70 ? 0.13 : 0.19)));
  const dlpEscalated = Math.max(0, Math.round(dlpI * (posture >= 82 ? 0.12 : posture >= 70 ? 0.18 : 0.26)));
  const otH      = Math.round(otP * 0.6);
  const otS      = Math.round(otP * 0.35);
  const itEp     = Math.round(itSv * 7);
  const itNw     = Math.round(itSv * 0.4);
  const itCl     = Math.round(itSv * 1.8);
  const awPct    = Math.min(100, Math.round(posture * 0.9 + 12));
  const awTo     = Math.round(itEp / 4) + 15;
  const campCR   = Math.max(1, Math.round((100 - posture) / 11));
  const campSent = Math.round(awTo * 2.5);
  const accOv    = Math.max(0, Math.round((100 - posture) / 5));
  const accTo    = awTo;
  const govCo    = Math.round(posture * 0.75);
  const govRD    = Math.round((100 - posture) * 0.25);
  const govNC    = Math.round((100 - posture) * 0.15);
  const retPct   = Math.min(100, Math.round(posture * 0.85 + 15));
  const retDays  = Math.round(retPct * 1.8);
  const appTotal = Math.max(18, Math.round(itSv * 0.42));
  const appClass1 = Math.max(3, Math.round(appTotal * (0.16 + (100 - posture) / 500)));
  const appClass2 = Math.max(5, Math.round(appTotal * 0.34));
  const appClass3 = Math.max(1, appTotal - appClass1 - appClass2);
  const vulnHigh = Math.max(expC, Math.round(expF * (posture < 70 ? 0.25 : 0.18)));
  const vulnMedium = Math.max(1, Math.round(expF * 0.34));
  const vulnLow = Math.max(0, expF - expC - vulnHigh - vulnMedium);
  const estate = itSv + itEp + itNw + itCl;
  const protectedEstate = Math.round(estate * Math.min(0.96, posture / 100 + 0.08));
  const noDrEstate = Math.round(estate * Math.max(0.02, (82 - posture) / 280));
  const atRiskEstate = Math.max(0, estate - protectedEstate - noDrEstate);

  const expScore  = Math.max(0, Math.min(100, Math.round(100 - expF * 0.4)));
  const assScore  = Math.max(0, Math.min(100, Math.round(100 - assF * 0.5)));
  const archTotal = archC + archS;
  const archScore = archTotal > 0 ? Math.round((archC / archTotal) * 100) : 90;
  const dlpScore  = Math.max(0, Math.min(100, Math.round(100 - dlpI * 7)));
  const otScore   = Math.max(0, Math.min(100, Math.round(posture - 8)));
  const itScore   = Math.min(100, Math.round(posture + 5));
  const campScore = Math.max(0, Math.min(100, Math.round(100 - campCR * 7)));
  const accScore  = Math.max(0, Math.min(100, Math.round(100 - (accOv / (accTo || 1)) * 100)));
  const govTotal  = govCo + govRD + govNC;
  const govScore  = govTotal > 0 ? Math.round((govCo / govTotal) * 100) : 80;
  const dlpProtocols = {
    email: Math.max(1, Math.round(dlpI * 0.35 + expC * 0.2)),
    https: Math.max(1, Math.round(dlpI * 0.30 + itSv * 0.02)),
    removable: Math.max(0, Math.round(dlpI * (bu === 'Manufacturing' ? 0.24 : 0.14))),
    sync: Math.max(0, Math.round(dlpI * 0.18 + govNC * 0.1)),
  };
  const dlpRecipientCategories = {
    aiTools: Math.max(0, Math.round(dlpI * (bu === 'R&D' || bu === 'Engineering' ? 0.34 : 0.18))),
    internal: Math.max(1, Math.round(dlpI * 0.28)),
    personalDrive: Math.max(0, Math.round(dlpI * (posture < 72 ? 0.26 : 0.14))),
    vendor: Math.max(0, Math.round(dlpI * 0.20 + archS)),
    partner: Math.max(0, Math.round(dlpI * 0.12 + govRD * 0.1)),
  };
  const dlpWorkerTypes = {
    employee: Math.max(1, Math.round(dlpI * 0.52)),
    contractor: Math.max(0, Math.round(dlpI * 0.24)),
    vendor: Math.max(0, Math.round(dlpI * 0.14)),
    partner: Math.max(0, Math.round(dlpI * 0.10)),
  };
  const dlpTimeline = Array.from({ length: 12 }, (_, index) => {
    const wave = Math.max(0, Math.round(Math.sin((index + posture % 5) * 0.85) * 2));
    const spike = index === (posture % 7) + 3 ? Math.max(2, Math.round(dlpI * 0.28)) : 0;
    const alerts = Math.max(0, Math.round(dlpI / 3) + wave + spike - (index % 4 === 0 ? 1 : 0));
    const critical = Math.max(0, Math.round(alerts * (posture < 70 ? 0.18 : 0.08)));
    const high = Math.max(0, Math.round(alerts * (posture < 78 ? 0.32 : 0.22)));
    const medium = Math.max(0, Math.round(alerts * 0.34));
    const low = Math.max(0, alerts - critical - high - medium);
    return {
      label: `T-${11 - index}`,
      alerts,
      critical,
      high,
      medium,
      low,
    };
  });
  const dlpTopSources = [
    { name: `${bu} Operations`, count: Math.max(1, Math.round(dlpI * 0.34 + expC)), status: ss(Math.max(0, dlpScore - 8)) },
    { name: `${region} Shared Services`, count: Math.max(1, Math.round(dlpI * 0.26 + govNC)), status: ss(dlpScore) },
    { name: 'Engineering Workspace', count: Math.max(0, Math.round(dlpI * 0.21 + archS)), status: ss(Math.min(100, dlpScore + 7)) },
    { name: 'Partner Exchange', count: Math.max(0, Math.round(dlpI * 0.16 + govRD)), status: ss(Math.min(100, dlpScore + 12)) },
  ];

  return {
    id, name, lat, lng, region, businessUnit: bu,
    postureScore: posture,
    deskAnalytics: {
      appClassification: { class1: appClass1, class2: appClass2, class3: appClass3 },
      vulnerabilitySeverity: { critical: expC, high: vulnHigh, medium: vulnMedium, low: vulnLow },
      drStatus: { protected: protectedEstate, atRisk: atRiskEstate, noDr: noDrEstate },
      compliance: {
        frameworkA: Math.max(35, Math.min(98, posture + 4)),
        frameworkB: Math.max(30, Math.min(97, posture - 3)),
        frameworkC: Math.max(32, Math.min(99, posture + (posture % 7) - 4)),
      },
    },
    domains: {
      exposure: {
        score: expScore, trend: posture >= 80 ? 2 : -2, status: ss(expScore),
        findings: expF, criticals: expC, severity: sev(expC, expF),
      },
      app_assurance: {
        score: assScore, trend: 1, status: ss(assScore),
        findings: assF, openTests: Math.round(assF * 0.6),
      },
      arch_reviews: {
        score: archScore, trend: 3, status: ss(archScore),
        completed: archC, scheduled: archS, type: archType,
      },
      dlp: {
        score: dlpScore, trend: 0, status: ss(dlpScore),
        policies: dlpP, incidents: dlpI, blocked: dlpBlocked, falsePositives: dlpFalsePositives, escalated: dlpEscalated,
        protocols: dlpProtocols,
        recipientCategories: dlpRecipientCategories,
        workerTypes: dlpWorkerTypes,
        timeline: dlpTimeline,
        topSources: dlpTopSources,
      },
      ot_assets: {
        score: otScore, trend: -1, status: ss(otScore),
        plcs: otP, hmis: otH, scada: otS,
      },
      it_assets: {
        score: itScore, trend: 2, status: ss(itScore),
        servers: itSv, endpoints: itEp, network: itNw, cloud: itCl,
      },
      awareness: {
        score: awPct, trend: 3, status: ss(awPct),
        completion_pct: awPct, trained: Math.round(awTo * awPct / 100), total: awTo,
      },
      sim_campaigns: {
        score: campScore, trend: 1, status: ss(campScore),
        click_rate: campCR, sent: campSent, clicked: Math.round(campSent * campCR / 100),
      },
      access_recert: {
        score: accScore, trend: -1, status: ss(accScore),
        overdue: accOv, total_users: accTo,
      },
      app_governance: {
        score: govScore, trend: 0, status: ss(govScore),
        compliant: govCo, review_due: govRD, non_compliant: govNC,
      },
      activity_retention: {
        score: retPct, trend: 1, status: ss(retPct),
        coverage_pct: retPct, days_retained: retDays,
      },
      posture_index: { score: posture, trend: 0, status: ss(posture) },
    },
    recentActivity: acts.map(([type, title, severity, h]) => ({
      time: new Date(DEMO_ACTIVITY_BASE_TIME - h * 3600000).toISOString(),
      type, title, severity,
    })),
  };
}

// ── Master Site Registry (28 sites) ────────────────────────────────────────────

export const MASTER_SITES: SiteRecord[] = [

  // ── Non-India sites ────────────────────────────────────────────────────────

  build('north-hub',      'North Hub',      48.85,   2.35, 'EMEA',  'Corporate',     88,  42, 210, 45, 'Cloud Platform',
    [['scan','Vuln scan complete — 0 criticals','LOW',2],['patch','Patch cycle: 12 hosts updated','LOW',6],['alert','TLS misconfiguration flagged','MEDIUM',18]]),

  build('emea-node',      'EMEA Node',      51.51,  -0.13, 'EMEA',  'Engineering',   82,  67, 185, 38, 'Identity Provider',
    [['scan','DAST scan: 3 new findings','MEDIUM',3],['access','2 overdue access reviews','MEDIUM',9],['patch','Patch applied: CVE-2025-1234','LOW',24]]),

  build('nordic-site',    'Nordic Site',    59.91,  10.75, 'EMEA',  'R&D',           91,  28,  95, 22, 'SIEM Architecture',
    [['scan','Pen test passed — 0 criticals','LOW',1],['aware','Training completion hit 95%','LOW',12]]),

  build('central-hub',    'Central Hub',    40.71, -74.01, 'AMER',  'Corporate',     79,  89, 320, 60, 'Data Warehouse',
    [['alert','Critical: unpatched RCE in ERP module','CRITICAL',1],['scan','SAST scan: 14 findings','HIGH',4],['access','7 overdue access reviews flagged','HIGH',10]]),

  build('west-coast-hub', 'West Coast Hub', 37.77,-122.42, 'AMER',  'Technology',    86,  51, 280, 30, 'API Gateway',
    [['scan','API scan: 2 medium findings','MEDIUM',2],['patch','Zero-day patched across 18 hosts','LOW',8],['aware','Phishing sim: 4.2% click rate','MEDIUM',20]]),

  build('midwest-node',   'Midwest Node',   41.88, -87.63, 'AMER',  'Manufacturing', 71, 112, 180, 95, 'Dev/Sec Pipeline',
    [['alert','OT network anomaly detected','HIGH',1],['scan','Pen test: 4 critical findings','CRITICAL',5],['patch','15 systems missing Q4 patches','HIGH',14]]),

  build('southeast-hub',  'Southeast Hub',  33.75, -84.39, 'AMER',  'Distribution',  84,  58, 155, 48, 'Backup & Recovery',
    [['scan','Monthly scan: 6 findings','MEDIUM',3],['aware','Training completion: 88%','LOW',16]]),

  build('latam-node',     'LATAM Node',    -23.55, -46.63, 'LATAM', 'Operations',    68, 134, 120, 72, 'Edge Deployment',
    [['alert','DLP: 8 GB exfil attempt blocked','HIGH',1],['scan','SAST: 18 findings','HIGH',6],['access','12 overdue recerts','HIGH',12]]),

  build('apac-site-1',    'APAC Site 1',    35.68, 139.65, 'APAC',  'Technology',    85,  55, 195, 40, 'Zero-Trust Pilot',
    [['scan','ZT pilot phase 2 complete','LOW',4],['patch','Emergency patch applied','MEDIUM',10],['aware','Sim campaign: 3.8% click rate','MEDIUM',22]]),

  build('apac-site-2',    'APAC Site 2',    22.32, 114.17, 'APAC',  'Engineering',   77,  98, 160, 55, 'ERP Integration',
    [['alert','Auth bypass finding in ERP integration','HIGH',2],['scan','Threat model review complete','MEDIUM',8],['access','5 access reviews overdue','MEDIUM',20]]),

  build('apac-site-3',    'APAC Site 3',     1.35, 103.82, 'APAC',  'Distribution',  83,  63, 140, 35, 'Cloud WAF',
    [['scan','WAF rule update deployed','LOW',3],['patch','4 dependencies patched','LOW',14]]),

  build('south-hub',      'South Hub',     -33.87, 151.21, 'APAC',  'Operations',    87,  44, 175, 42, 'Backup & Recovery',
    [['scan','DR test: passed','LOW',5],['aware','Training: 94% completion','LOW',18]]),

  build('mea-node',       'MEA Node',       24.45,  54.38, 'MEA',   'Operations',    62, 158, 110, 88, 'Secure Remote Access',
    [['alert','3 critical vulns unpatched','CRITICAL',1],['scan','Pen test: 6 criticals','CRITICAL',3],['access','18 overdue recerts','CRITICAL',8],['dlp','Cloud DLP: 2 incidents blocked','HIGH',15]]),

  // ── India sites (15) ──────────────────────────────────────────────────────

  build('india-hub-1',    'India Hub 1',    19.08,  72.88, 'APAC',  'Manufacturing', 74, 112, 165, 78, 'Service Mesh',
    [['alert','SCADA firmware outdated on 3 nodes','HIGH',2],['scan','SAST: 8 findings','MEDIUM',8],['patch','Patch cycle started — 22 hosts','MEDIUM',16]]),

  build('india-plant-2',  'India Plant 2',  22.61,  75.69, 'APAC',  'Manufacturing', 65, 145, 140, 92, 'OT Network Segment',
    [['alert','OT: unauthorised device detected','HIGH',1],['scan','ICS audit: 4 critical findings','CRITICAL',4],['patch','14 hosts missing patches','HIGH',10]]),

  build('india-node-3',   'India Node 3',   17.98,  74.43, 'APAC',  'Operations',    81,  58, 105, 44, 'API Gateway',
    [['scan','API gateway scan: 2 medium findings','MEDIUM',3],['aware','Training: 89% complete','LOW',14]]),

  build('india-plant-4',  'India Plant 4',  22.80,  86.20, 'APAC',  'Manufacturing', 58, 178, 130,108, 'OT Network Segment',
    [['alert','4 critical CVEs unpatched','CRITICAL',1],['scan','Pen test: critical OT finding','CRITICAL',3],['access','15 overdue recerts','HIGH',7]]),

  build('india-hub-5',    'India Hub 5',    19.88,  75.32, 'APAC',  'Engineering',   72, 105, 120, 65, 'ERP Integration',
    [['scan','ERP SAST: 6 findings','MEDIUM',2],['patch','9 hosts updated','LOW',10],['aware','Phishing sim: 6.1% click rate','MEDIUM',18]]),

  build('india-node-6',   'India Node 6',   20.52,  72.97, 'APAC',  'Distribution',  88,  38,  95, 28, 'Cloud WAF',
    [['scan','WAF audit: no critical findings','LOW',4],['patch','All systems patched','LOW',12]]),

  build('india-plant-7',  'India Plant 7',  23.03,  72.58, 'APAC',  'Manufacturing', 61, 152, 145, 95, 'Dev/Sec Pipeline',
    [['alert','Critical: exposed admin interface','CRITICAL',1],['scan','Pen test: 5 critical findings','CRITICAL',5],['access','11 overdue recerts','HIGH',11]]),

  build('india-hub-8',    'India Hub 8',    23.26,  77.41, 'APAC',  'R&D',           79,  75, 135, 52, 'Zero-Trust Pilot',
    [['scan','ZT assessment complete','MEDIUM',2],['patch','Security patch deployed','LOW',9],['aware','Awareness training: 91%','LOW',20]]),

  build('india-node-9',   'India Node 9',   13.08,  80.27, 'APAC',  'Operations',    83,  62, 115, 38, 'Identity Provider',
    [['scan','IdP audit: 2 medium findings','MEDIUM',3],['patch','IdP patched to latest','LOW',15]]),

  build('india-plant-10', 'India Plant 10', 11.01,  76.97, 'APAC',  'Manufacturing', 55, 192, 125,115, 'OT Network Segment',
    [['alert','5 critical CVEs unmitigated','CRITICAL',1],['scan','ICS audit: multiple critical findings','CRITICAL',2],['dlp','Sensitive data found on OT network','CRITICAL',6]]),

  build('india-node-11',  'India Node 11',  22.97,  76.07, 'APAC',  'Distribution',  76,  88, 110, 60, 'Cloud Platform',
    [['scan','Cloud scan: 3 medium findings','MEDIUM',4],['access','6 overdue recerts','MEDIUM',12],['aware','Training: 85%','LOW',22]]),

  build('india-hub-12',   'India Hub 12',   16.70,  74.24, 'APAC',  'Engineering',   84,  55, 130, 45, 'SIEM Architecture',
    [['scan','SIEM coverage expanded to 98%','LOW',2],['patch','Log retention gaps closed','LOW',8]]),

  build('india-plant-13', 'India Plant 13', 21.15,  79.08, 'APAC',  'Manufacturing', 67, 128, 155, 85, 'Backup & Recovery',
    [['alert','Backup failure on 2 nodes','MEDIUM',1],['scan','Pen test: 3 high findings','HIGH',6],['patch','12 systems pending patch','HIGH',14]]),

  build('india-node-14',  'India Node 14',  28.98,  79.40, 'APAC',  'Operations',    70,  98,  90, 55, 'Edge Deployment',
    [['scan','Edge audit: 4 findings','MEDIUM',3],['access','8 overdue recerts','MEDIUM',10],['aware','Phishing sim: 7.4% click rate','HIGH',18]]),

  build('india-hub-15',   'India Hub 15',   18.52,  73.86, 'APAC',  'Technology',    85,  48, 145, 40, 'Cloud Platform',
    [['scan','Cloud audit: all controls passed','LOW',2],['patch','All hosts up to date','LOW',10],['aware','Training: 96% completion','LOW',20]]),
];

export const SITE_BY_ID = new Map(MASTER_SITES.map(s => [s.id, s]));
