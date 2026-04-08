/**
 * OpenBounty Event Emitter — Sends SEO events to OpenBounty for time tracking.
 *
 * Usage in server actions:
 *   import { emitZleEvent } from '@/lib/zle-events'
 *   await emitZleEvent('opensem.audit.completed', { score: 78, url: 'example.com' })
 */

const ZLE_API_URL = process.env.ZLE_API_URL || 'http://localhost:4670'

export interface ZleEventPayload {
  source: 'opensem'
  eventType: string
  timestamp: string
  userId?: string
  arbeitsplatzId?: string
  data: Record<string, unknown>
}

/**
 * Send an event to OpenBounty's universal event endpoint.
 * Fire-and-forget: errors are logged but don't throw.
 */
export async function emitZleEvent(
  eventType: string,
  data: Record<string, unknown>,
  options?: { userId?: string; arbeitsplatzId?: string },
): Promise<void> {
  const payload: ZleEventPayload = {
    source: 'opensem',
    eventType,
    timestamp: new Date().toISOString(),
    userId: options?.userId,
    arbeitsplatzId: options?.arbeitsplatzId,
    data,
  }

  try {
    const res = await fetch(`${ZLE_API_URL}/api/opendesktop/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000), // 5s timeout
    })

    if (!res.ok) {
      console.warn(`[zle-events] Failed to emit ${eventType}: ${res.status} ${res.statusText}`)
    }
  } catch (err) {
    // Fire-and-forget: log but don't throw
    console.warn(`[zle-events] Error emitting ${eventType}:`, err instanceof Error ? err.message : err)
  }
}

/** Convenience: emit SEO audit completed */
export async function emitAuditCompleted(data: { score: number; url: string; issues?: number }) {
  return emitZleEvent('opensem.audit.completed', data)
}

/** Convenience: emit keyword tracked */
export async function emitKeywordTracked(data: { count: number; locale?: string }) {
  return emitZleEvent('opensem.keyword.tracked', data)
}

/** Convenience: emit report generated */
export async function emitReportGenerated(data: { type: string; pages?: number }) {
  return emitZleEvent('opensem.report.generated', data)
}

/** Convenience: emit competitor analyzed */
export async function emitCompetitorAnalyzed(data: { competitor: string; metrics?: Record<string, unknown> }) {
  return emitZleEvent('opensem.competitor.analyzed', data)
}

/** Convenience: emit paid search sync completed */
export async function emitPaidSearchSynced(data: { accounts: number; keywords: number; searchTerms: number }) {
  return emitZleEvent('opensem.paid.synced', data)
}

/** Convenience: emit keyword bridge recommendations generated */
export async function emitBridgeGenerated(data: { recommendations: number; highPriority: number }) {
  return emitZleEvent('opensem.bridge.generated', data)
}

/** Convenience: emit cannibalization detected */
export async function emitCannibalizationDetected(data: { critical: number; warning: number; potentialSavings: number }) {
  return emitZleEvent('opensem.cannibalization.detected', data)
}
