import { kv } from '@vercel/kv'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { CloudSnapshot } from '../src/types/sync'

const SNAPSHOT_TTL_SECONDS = 60 * 60 * 24 * 90 // 90 days
const MAX_PAYLOAD_BYTES = 1024 * 1024 // 1 MB

function keyFor(token: string): string {
  return `helm:tasks:${token}`
}

function isConfigured(): boolean {
  return Boolean(process.env.KV_URL || process.env.KV_REST_API_URL)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'Sync not configured' })
  }

  const token = req.query.token
  if (typeof token !== 'string' || token.length === 0) {
    return res.status(400).json({ error: 'Missing token query parameter' })
  }

  if (req.method === 'GET') {
    try {
      const snapshot = (await kv.get(keyFor(token))) as CloudSnapshot | null
      if (!snapshot) {
        return res.status(200).json({ tasks: [], updatedAt: null })
      }
      return res.status(200).json(snapshot)
    } catch (e) {
      console.error('KV read failed:', e)
      return res.status(500).json({ error: 'Failed to read snapshot' })
    }
  }

  if (req.method === 'POST') {
    const contentLength = Number(req.headers['content-length'] ?? 0)
    if (contentLength > MAX_PAYLOAD_BYTES) {
      return res.status(413).json({ error: 'Snapshot too large' })
    }

    const body = req.body
    if (!body || !Array.isArray(body.tasks)) {
      return res.status(400).json({ error: 'Invalid snapshot: tasks must be an array' })
    }

    const snapshot: CloudSnapshot = {
      tasks: body.tasks,
      updatedAt: new Date().toISOString(),
    }

    try {
      await kv.set(keyFor(token), snapshot, { ex: SNAPSHOT_TTL_SECONDS })
      return res.status(200).json({ ok: true, updatedAt: snapshot.updatedAt })
    } catch (e) {
      console.error('KV write failed:', e)
      return res.status(500).json({ error: 'Failed to write snapshot' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
