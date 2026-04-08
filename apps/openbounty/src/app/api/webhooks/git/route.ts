import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleLeistungen } from '@/db/schema'
import { newId } from '@/lib/ids'
import { createHmac, timingSafeEqual } from 'crypto'

function verifySignature(body: string, signatureHeader: string | null): boolean {
  const secret = process.env.ZLE_GITHUB_WEBHOOK_SECRET
  if (!secret) return true
  if (!signatureHeader) return false
  const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected))
  } catch {
    return false
  }
}

/** POST /api/webhooks/git — GitHub webhook receiver */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256')

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Ungueltige Signatur' }, { status: 401 })
  }

  const eventType = req.headers.get('x-github-event')
  const payload = JSON.parse(rawBody)
  const now = new Date()

  switch (eventType) {
    case 'push': {
      const commits = payload.commits ?? []
      const repo = payload.repository?.full_name ?? 'unknown'
      for (const commit of commits) {
        await db.insert(zleLeistungen).values({
          id: newId(),
          userId: commit.author?.username ?? commit.author?.email ?? 'unknown',
          typ: 'commit',
          titel: commit.message?.split('\n')[0]?.slice(0, 200) ?? 'Commit',
          beschreibung: `${repo}: ${commit.message ?? ''}`.slice(0, 500),
          referenz: commit.id,
          metadata: {
            repo,
            branch: payload.ref,
            added: commit.added?.length ?? 0,
            modified: commit.modified?.length ?? 0,
            removed: commit.removed?.length ?? 0,
          },
          erfasstAm: new Date(commit.timestamp || now),
        })
      }
      return NextResponse.json({ ok: true, processed: commits.length })
    }

    case 'pull_request': {
      const pr = payload.pull_request
      if (!pr) return NextResponse.json({ ok: true, ignored: true })
      const action = payload.action
      if (!['opened', 'closed', 'merged'].includes(action)) {
        return NextResponse.json({ ok: true, ignored: true })
      }
      await db.insert(zleLeistungen).values({
        id: newId(),
        userId: pr.user?.login ?? 'unknown',
        typ: 'pr',
        titel: `PR ${action}: ${pr.title}`.slice(0, 200),
        beschreibung: pr.body?.slice(0, 500) ?? null,
        referenz: pr.html_url,
        metadata: {
          repo: payload.repository?.full_name,
          prNumber: pr.number,
          action,
          merged: pr.merged ?? false,
        },
        erfasstAm: now,
      })
      return NextResponse.json({ ok: true })
    }

    case 'deployment_status': {
      const status = payload.deployment_status?.state
      if (status !== 'success') return NextResponse.json({ ok: true, ignored: true })
      const deployment = payload.deployment
      await db.insert(zleLeistungen).values({
        id: newId(),
        userId: deployment?.creator?.login ?? 'unknown',
        typ: 'deployment',
        titel: `Deployment: ${payload.repository?.full_name ?? 'unknown'}`,
        beschreibung: deployment?.description?.slice(0, 500) ?? null,
        referenz: deployment?.sha ?? null,
        metadata: {
          repo: payload.repository?.full_name,
          environment: deployment?.environment,
          url: payload.deployment_status?.target_url,
        },
        erfasstAm: now,
      })
      return NextResponse.json({ ok: true })
    }

    default:
      return NextResponse.json({ ok: true, ignored: true, event: eventType })
  }
}
