import type { ArbeitsplatzKonfiguration, ArbeitsplatzDokumentation } from '@/db/schema'

export interface OpenDesktopProfil {
  id: string
  name: string
  beschreibung: string
  typ: 'maschine' | 'desktop' | 'remote' | 'mobil'
  maschinenTyp?: string
  ecosystemId?: string
  konfiguration: ArbeitsplatzKonfiguration
  dokumentation: ArbeitsplatzDokumentation[]
  autoLogoutMinuten: number
}

export const PROFIL_AUTOPILOT: OpenDesktopProfil = {
  id: 'autopilot',
  name: 'CT-Scanner (AutoPilot)',
  beschreibung: 'WinWerth CT-Scanner Arbeitsplatz mit Scan-Workflow, Kalibrierung und Wartung',
  typ: 'maschine',
  maschinenTyp: 'ct-scanner',
  ecosystemId: 'autopilot',
  konfiguration: {
    widgets: ['todos', 'dokumentation', 'timer', 'maschinen-status', 'scan-queue'],
    todoKategorien: ['scan-auftrag', 'kalibrierung', 'wartung', 'qualitaetspruefung', 'allgemein'],
    eventQuellen: ['autopilot.scan.started', 'autopilot.scan.completed', 'autopilot.scan.failed', 'autopilot.calibration'],
  },
  dokumentation: [
    { titel: 'CT-Scanner Bedienungsanleitung', typ: 'anleitung', inhalt: 'Grundlegende Schritte fuer den CT-Scan-Workflow' },
    { titel: 'Sicherheitshinweise Roentgenstrahlung', typ: 'sicherheit', inhalt: 'Strahlenschutz-Richtlinien am CT-Arbeitsplatz' },
    { titel: 'Kalibrierungsprotokoll', typ: 'wartung', inhalt: 'Hell-/Dunkelkorrektur alle 4h' },
  ],
  autoLogoutMinuten: 480,
}

export const PROFIL_ERSATZTEILDRUCKEN: OpenDesktopProfil = {
  id: 'ersatzteildrucken',
  name: '3D-Drucker (Ersatzteildrucken)',
  beschreibung: 'FDM/SLA Drucker-Arbeitsplatz mit Druck-Jobs und Material-Tracking',
  typ: 'maschine',
  maschinenTyp: 'fdm-drucker',
  ecosystemId: 'etd',
  konfiguration: {
    widgets: ['todos', 'dokumentation', 'timer', 'druck-queue'],
    todoKategorien: ['druck-auftrag', 'material-wechsel', 'wartung', 'qualitaetspruefung', 'allgemein'],
    eventQuellen: ['etd.druck.started', 'etd.druck.completed', 'etd.druck.failed'],
  },
  dokumentation: [
    { titel: 'Drucker-Bedienungsanleitung', typ: 'anleitung' },
    { titel: 'Material-Handbuch (PLA, PETG, ASA)', typ: 'anleitung' },
    { titel: 'Wartungsplan', typ: 'wartung' },
  ],
  autoLogoutMinuten: 480,
}

export const PROFIL_ERSATZTEILSCANNEN: OpenDesktopProfil = {
  id: 'ersatzteilscannen',
  name: 'Scanner (Ersatzteilscannen)',
  beschreibung: 'Bauteil-Scanner-Arbeitsplatz fuer Reverse Engineering',
  typ: 'maschine',
  maschinenTyp: 'bauteil-scanner',
  ecosystemId: 'etd',
  konfiguration: {
    widgets: ['todos', 'dokumentation', 'timer', 'scan-queue'],
    todoKategorien: ['scan-auftrag', 'nachbearbeitung', 'qualitaetspruefung', 'allgemein'],
    eventQuellen: ['etd.scan.started', 'etd.scan.completed'],
  },
  dokumentation: [
    { titel: 'Scanner-Bedienungsanleitung', typ: 'anleitung' },
    { titel: 'Scan-Qualitaetsrichtlinien', typ: 'anleitung' },
  ],
  autoLogoutMinuten: 480,
}

export const PROFIL_OFFICE: OpenDesktopProfil = {
  id: 'office',
  name: 'Buero-Arbeitsplatz',
  beschreibung: 'Standard-Buero-Arbeitsplatz mit Meeting-Kalender und Projekt-TODOs',
  typ: 'desktop',
  konfiguration: {
    widgets: ['todos', 'dokumentation', 'timer', 'meetings', 'proof-of-work'],
    todoKategorien: ['entwicklung', 'meeting', 'dokumentation', 'review', 'allgemein'],
    eventQuellen: [],
  },
  dokumentation: [],
  autoLogoutMinuten: 600,
}

export const PROFIL_REMOTE: OpenDesktopProfil = {
  id: 'remote',
  name: 'Home Office',
  beschreibung: 'Remote-Arbeitsplatz mit Proof-of-Work-Fokus',
  typ: 'remote',
  konfiguration: {
    widgets: ['todos', 'timer', 'proof-of-work', 'meetings'],
    todoKategorien: ['entwicklung', 'meeting', 'dokumentation', 'review', 'allgemein'],
    eventQuellen: [],
  },
  dokumentation: [],
  autoLogoutMinuten: 600,
}

export const PROFIL_PERFORMANCE_MARKETING: OpenDesktopProfil = {
  id: 'performance-marketing',
  name: 'Performance Marketing (OpenSEM)',
  beschreibung: 'Home-Office Arbeitsplatz fuer SEO, Keyword-Tracking, Competitor-Analyse und Web-Analytics',
  typ: 'remote',
  ecosystemId: 'opensoftware',
  konfiguration: {
    widgets: ['todos', 'timer', 'proof-of-work', 'meetings', 'seo-dashboard'],
    todoKategorien: ['seo-audit', 'keyword-recherche', 'competitor-analyse', 'content-optimierung', 'reporting', 'link-building', 'allgemein'],
    eventQuellen: ['opensem.audit.completed', 'opensem.keyword.tracked', 'opensem.report.generated', 'opensem.competitor.analyzed'],
  },
  dokumentation: [
    { titel: 'SEO-Audit Checkliste', typ: 'anleitung', inhalt: 'Monatlicher Site-Audit: PageSpeed, Core Web Vitals, Broken Links, Meta-Tags' },
    { titel: 'Keyword-Strategie', typ: 'anleitung', inhalt: 'Keyword-Recherche-Workflow: Seed Keywords, Volume, Difficulty, Content Mapping' },
  ],
  autoLogoutMinuten: 600,
}

export const OPENDESKTOP_PROFILE_REGISTRY: Record<string, OpenDesktopProfil> = {
  autopilot: PROFIL_AUTOPILOT,
  ersatzteildrucken: PROFIL_ERSATZTEILDRUCKEN,
  ersatzteilscannen: PROFIL_ERSATZTEILSCANNEN,
  office: PROFIL_OFFICE,
  remote: PROFIL_REMOTE,
  'performance-marketing': PROFIL_PERFORMANCE_MARKETING,
}

export function getOpenDesktopProfil(profilId: string): OpenDesktopProfil | undefined {
  return OPENDESKTOP_PROFILE_REGISTRY[profilId]
}

export function getOpenDesktopProfilIds(): string[] {
  return Object.keys(OPENDESKTOP_PROFILE_REGISTRY)
}
