/** OpenDesktop profile IDs */
export const OPENDESKTOP_PROFILES = {
  AUTOPILOT: 'autopilot',
  ERSATZTEILDRUCKEN: 'ersatzteildrucken',
  ERSATZTEILSCANNEN: 'ersatzteilscannen',
  OFFICE: 'office',
  REMOTE: 'remote',
  PERFORMANCE_MARKETING: 'performance-marketing',
} as const

export type OpenDesktopProfileId = (typeof OPENDESKTOP_PROFILES)[keyof typeof OPENDESKTOP_PROFILES]

/** Arbeitsplatz types */
export const ARBEITSPLATZ_TYPEN = ['maschine', 'desktop', 'remote', 'mobil'] as const
export type ArbeitsplatzTyp = (typeof ARBEITSPLATZ_TYPEN)[number]

/** Zeiteintrag types */
export const ZEITEINTRAG_TYPEN = ['arbeitsplatz', 'meeting', 'manuell', 'pause'] as const
export type ZeiteintragTyp = (typeof ZEITEINTRAG_TYPEN)[number]

/** Zeiteintrag sources */
export const ZEITEINTRAG_QUELLEN = ['arbeitsplatz_session', 'meetily', 'teams', 'manuell', 'api'] as const
export type ZeiteintragQuelle = (typeof ZEITEINTRAG_QUELLEN)[number]

/** TODO sources */
export const TODO_QUELLEN = ['manuell', 'meeting_transkript', 'git_issue', 'import'] as const
export type TodoQuelle = (typeof TODO_QUELLEN)[number]

/** Leistung types */
export const LEISTUNG_TYPEN = [
  'commit', 'pr', 'deployment', 'review',
  'todo_erledigt', 'meeting_teilnahme', 'dokumentation', 'custom',
] as const
export type LeistungTyp = (typeof LEISTUNG_TYPEN)[number]

/** Default auto-logout in minutes */
export const DEFAULT_AUTO_LOGOUT_MINUTEN = 480 // 8 hours
