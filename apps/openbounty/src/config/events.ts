/**
 * OpenBounty Event Registry — Maps external event types to OpenBounty actions.
 * Used by POST /api/opendesktop/events to process incoming events.
 */

export type EventAction = 'zeiteintrag' | 'leistung' | 'update'

export interface EventRegistryEntry {
  erzeugt: EventAction
  leistungTyp?: string
  titel?: string
  aktion?: string
}

export const EVENT_REGISTRY: Record<string, EventRegistryEntry> = {
  // AutoPilot Events
  'autopilot.scan.started':    { erzeugt: 'zeiteintrag' },
  'autopilot.scan.completed':  { erzeugt: 'leistung', leistungTyp: 'custom', titel: 'CT-Scan abgeschlossen' },
  'autopilot.scan.failed':     { erzeugt: 'leistung', leistungTyp: 'custom', titel: 'CT-Scan fehlgeschlagen' },
  'autopilot.calibration':     { erzeugt: 'leistung', leistungTyp: 'custom', titel: 'Kalibrierung durchgefuehrt' },

  // OpenSEM Events
  'opensem.audit.completed':     { erzeugt: 'leistung', leistungTyp: 'custom', titel: 'SEO-Audit abgeschlossen' },
  'opensem.keyword.tracked':     { erzeugt: 'leistung', leistungTyp: 'custom', titel: 'Keyword-Analyse' },
  'opensem.report.generated':    { erzeugt: 'leistung', leistungTyp: 'dokumentation', titel: 'SEO-Report generiert' },
  'opensem.competitor.analyzed': { erzeugt: 'leistung', leistungTyp: 'custom', titel: 'Competitor-Analyse' },

  // Ersatzteildrucken Events (Phase 2)
  'etd.druck.started':    { erzeugt: 'zeiteintrag' },
  'etd.druck.completed':  { erzeugt: 'leistung', leistungTyp: 'custom', titel: 'Druck-Job abgeschlossen' },
  'etd.druck.failed':     { erzeugt: 'leistung', leistungTyp: 'custom', titel: 'Druck-Job fehlgeschlagen' },
  'etd.material.changed': { erzeugt: 'leistung', leistungTyp: 'custom', titel: 'Material gewechselt' },
  'etd.scan.started':     { erzeugt: 'zeiteintrag' },
  'etd.scan.completed':   { erzeugt: 'leistung', leistungTyp: 'custom', titel: 'Scan abgeschlossen' },

  // OpenFarm Events (Phase 2)
  'openfarm.druck.started':   { erzeugt: 'zeiteintrag' },
  'openfarm.druck.completed': { erzeugt: 'leistung', leistungTyp: 'custom', titel: 'Farm-Druck abgeschlossen' },

  // Meeting Events
  'meetily.room.started': { erzeugt: 'zeiteintrag' },
  'meetily.room.ended':   { erzeugt: 'update', aktion: 'close_meeting' },
  'teams.meeting.started': { erzeugt: 'zeiteintrag' },

  // Git Events
  'git.push':         { erzeugt: 'leistung', leistungTyp: 'commit' },
  'git.pr.merged':    { erzeugt: 'leistung', leistungTyp: 'pr' },
  'git.deploy.success': { erzeugt: 'leistung', leistungTyp: 'deployment' },
} as const

export const EVENT_SOURCES = [
  'autopilot', 'opensem', 'etd', 'openfarm',
  'meetily', 'teams', 'git',
] as const

export type EventSource = (typeof EVENT_SOURCES)[number]

export function isKnownEvent(eventType: string): eventType is keyof typeof EVENT_REGISTRY {
  return eventType in EVENT_REGISTRY
}

export function getEventConfig(eventType: string): EventRegistryEntry | undefined {
  return EVENT_REGISTRY[eventType]
}

export function getEventsForSource(source: EventSource): string[] {
  const prefix = source + '.'
  return Object.keys(EVENT_REGISTRY).filter(key => key.startsWith(prefix))
}
