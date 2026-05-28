// DEMO MOCK — returns fictional data.
// In production, replace this body with the real backend fetch; the response shape is unchanged.

import { NextResponse } from 'next/server';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const CAMPAIGNS = [
  { id: 'CAM-241', title: 'Q2 Spear-Phish: Finance',   lat: 40.71, lng: -74.01, type: 'spear-phish',   click_rate: 6.2,  sent: 1840, clicked: 114, severity: 'high',   icon: 'phish'  },
  { id: 'CAM-242', title: 'Q2 Vishing: Exec Suite',    lat: 48.85, lng:   2.35, type: 'vishing',       click_rate: 3.1,  sent:  420, clicked:  13, severity: 'medium', icon: 'voice'  },
  { id: 'CAM-243', title: 'Q2 Smishing: Mobile Fleet', lat: 51.51, lng:  -0.13, type: 'smishing',      click_rate: 4.7,  sent:  980, clicked:  46, severity: 'medium', icon: 'sms'    },
  { id: 'CAM-244', title: 'Q2 Spear-Phish: IT Admins', lat: 37.77, lng:-122.42, type: 'spear-phish',   click_rate: 9.3,  sent:  310, clicked:  29, severity: 'high',   icon: 'phish'  },
  { id: 'CAM-245', title: 'Q2 Mass Phish: All-Staff',  lat: 35.68, lng: 139.65, type: 'mass-phish',    click_rate: 2.8,  sent: 4200, clicked: 118, severity: 'low',    icon: 'phish'  },
  { id: 'CAM-246', title: 'Q2 USB Drop: APAC Sites',   lat: 22.32, lng: 114.17, type: 'physical',      click_rate: 18.0, sent:  200, clicked:  36, severity: 'critical',icon: 'usb'   },
  { id: 'CAM-247', title: 'Q2 Spear-Phish: OT Staff',  lat: 19.08, lng:  72.88, type: 'spear-phish',   click_rate: 11.2, sent:  560, clicked:  63, severity: 'high',   icon: 'phish'  },
  { id: 'CAM-248', title: 'Q2 Mass Phish: LATAM',      lat:-23.55, lng: -46.63, type: 'mass-phish',    click_rate: 3.4,  sent: 1120, clicked:  38, severity: 'low',    icon: 'phish'  },
  { id: 'CAM-249', title: 'Q2 Spear-Phish: HR Team',   lat: 24.45, lng:  54.38, type: 'spear-phish',   click_rate: 7.8,  sent:  280, clicked:  22, severity: 'high',   icon: 'phish'  },
  { id: 'CAM-250', title: 'Q2 Credential Harvest',     lat: 59.91, lng:  10.75, type: 'cred-harvest',  click_rate: 5.5,  sent:  740, clicked:  41, severity: 'medium', icon: 'cred'   },
  { id: 'CAM-251', title: 'Q2 Spear-Phish: Legal',     lat: 41.88, lng: -87.63, type: 'spear-phish',   click_rate: 4.1,  sent:  190, clicked:   8, severity: 'medium', icon: 'phish'  },
  { id: 'CAM-252', title: 'Q2 Mass Phish: All Staff',  lat: 33.75, lng: -84.39, type: 'mass-phish',    click_rate: 2.2,  sent: 3800, clicked:  84, severity: 'low',    icon: 'phish'  },
  { id: 'CAM-253', title: 'Q2 Spear-Phish: Suppliers', lat:-33.87, lng: 151.21, type: 'spear-phish',   click_rate: 8.9,  sent:  450, clicked:  40, severity: 'high',   icon: 'phish'  },
];

export async function GET() {
  await delay(400 + Math.random() * 350);
  try {
    const campaign_events = CAMPAIGNS.map(c => ({
      ...c,
      title: c.title,
      type: c.type,
      icon: c.icon,
      severity: c.severity,
      source: 'Campaign Engine',
    }));
    return NextResponse.json(
      { campaign_events, total: campaign_events.length, timestamp: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch {
    return NextResponse.json({ campaign_events: [] }, { status: 500 });
  }
}
