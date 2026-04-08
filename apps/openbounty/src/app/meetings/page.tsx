import Link from 'next/link'
import { db } from '@/db'
import { zleMeetingZeiteintraege, zleZeiteintraege } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export default async function MeetingsPage() {
  const meetings = await db
    .select({
      id: zleMeetingZeiteintraege.id,
      meetingQuelle: zleMeetingZeiteintraege.meetingQuelle,
      meetingTitel: zleMeetingZeiteintraege.meetingTitel,
      teilnehmerAnzahl: zleMeetingZeiteintraege.teilnehmerAnzahl,
      hatTranskript: zleMeetingZeiteintraege.hatTranskript,
      hatAufzeichnung: zleMeetingZeiteintraege.hatAufzeichnung,
      zusammenfassungStatus: zleMeetingZeiteintraege.zusammenfassungStatus,
      startzeit: zleZeiteintraege.startzeit,
      endzeit: zleZeiteintraege.endzeit,
      dauer: zleZeiteintraege.dauer,
    })
    .from(zleMeetingZeiteintraege)
    .innerJoin(zleZeiteintraege, eq(zleMeetingZeiteintraege.zeiteintrageId, zleZeiteintraege.id))
    .orderBy(desc(zleZeiteintraege.startzeit))
    .limit(50)

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Meetings</h1>
        <p className="text-zinc-400 mt-1">Meeting-Verlauf</p>
      </header>

      {meetings.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 p-12 text-center text-zinc-500">
          Noch keine Meetings erfasst.
        </div>
      ) : (
        <div className="space-y-2">
          {meetings.map((m) => {
            const dauerMin = m.dauer ? Math.round(m.dauer / 60) : null
            const start = m.startzeit
              ? new Date(m.startzeit).toLocaleString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''
            const quelleBadge =
              m.meetingQuelle === 'meetily'
                ? 'bg-blue-900/50 text-blue-300'
                : 'bg-purple-900/50 text-purple-300'

            return (
              <Link
                key={m.id}
                href={`/meetings/${m.id}`}
                className="flex items-center gap-4 rounded-lg border border-zinc-800 p-4 hover:bg-zinc-900/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {m.meetingTitel ?? 'Meeting'}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${quelleBadge}`}>
                      {m.meetingQuelle}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-500 mt-1">
                    <span>{start}</span>
                    {dauerMin !== null && <span>{dauerMin} min</span>}
                    {m.teilnehmerAnzahl !== null && m.teilnehmerAnzahl > 0 && (
                      <span>{m.teilnehmerAnzahl} Teilnehmer</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {m.hatTranskript && (
                    <span className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
                      Transkript
                    </span>
                  )}
                  {m.hatAufzeichnung && (
                    <span className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
                      Aufzeichnung
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <div className="mt-6 text-center">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          &larr; Dashboard
        </Link>
      </div>
    </div>
  )
}
