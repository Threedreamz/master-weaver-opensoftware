import { NextResponse } from 'next/server'

/** Available OpenDesktop profiles — static registry */
const PROFILES = [
  { id: 'autopilot', name: 'AutoPilot CT-Scanner', beschreibung: 'CT-Scanner-Arbeitsplatz mit Werth-Integration', typ: 'maschine' },
  { id: 'office', name: 'Office Desktop', beschreibung: 'Standard-Bueroarbeitsplatz', typ: 'desktop' },
  { id: '3dreamz', name: '3Dreamz Studio', beschreibung: '3D-Druck und Design-Arbeitsplatz', typ: 'maschine' },
  { id: 'remote', name: 'Remote Worker', beschreibung: 'Home-Office / Mobiler Arbeitsplatz', typ: 'remote' },
  { id: 'etd', name: 'Ersatzteildrucken', beschreibung: 'Ersatzteil-Produktions-Arbeitsplatz', typ: 'maschine' },
  { id: 'dev', name: 'Developer Station', beschreibung: 'Software-Entwicklungs-Arbeitsplatz', typ: 'desktop' },
  { id: 'warehouse', name: 'Lager & Logistik', beschreibung: 'Lager-Arbeitsplatz mit Scanner', typ: 'mobil' },
]

/** GET /api/einstellungen/profile — Verfuegbare OpenDesktop-Profile */
export async function GET() {
  return NextResponse.json(PROFILES)
}
