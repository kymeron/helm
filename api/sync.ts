import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { CloudSnapshot } from '../src/types/sync'

const SNAPSHOT_TTL_SECONDS = 60 * 60 * 24 * 90 // 90 days
const MAX_PAYLOAD_BYTES = 1024 * 1024 // 1 MB

/**
 * Upstash Redis REST API client.
 *
 * - Uses fetch() (Node 18+ on Vercel).
 * - Authentication: a single Bearer token, env var UPSTASH_REDIS_REST_TOKEN.
 * - Documented at https://upstash.com/docs/redis/api/rest
 */
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

function isConfigured(): boolean {
  return Boolean(UPSTASH_URL && UPSTASH_TOKEN)
}

function keyFor(token: string): string {
  return `helm:tasks:${token}`
}

interface UpstashOk<T = unknown> {
  result: T
}

interface UpstashErr {
  error: string
}

async function upstash<T = unknown>(command: unknown[]): Promise<T | null> {
  if (!isConfigured()) return null
  const path = command
    .map((c) => encodeURIComponent(String(c)))
    .join('/')
  const res = await fetch(`${UPSTASH_URL}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    let message = `Upstash ${res.status}`
    try {
      const body = (await res.json()) as UpstashErr
      if (body.error) message = body.error
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }
  const data = (await res.json()) as UpstashOk<T>
  return data.result
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
      const raw = await upstash<string | null>(['GET', keyFor(token)])
      if (!raw) {
        return res.status(200).json({ tasks: [], updatedAt: null })
      }
      try {
        const snapshot = JSON.parse(raw) as CloudSnapshot
        return res.status(200).json(snapshot)
      } catch {
        // Corrupt value; return empty snapshot rather than 500 the entire route.
        return res.status(200).json({ tasks: [], updatedAt: null })
      }
    } catch (e) {
      console.error('Upstash read failed:', e)
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
    const value = JSON.stringify(snapshot)
    if (value.length > MAX_PAYLOAD_BYTES) {
      return res.status(413).json({ error: 'Snapshot too large' })
    }

    try {
      await upstash(['SET', keyFor(token), value, 'EX', String(SNAPSHOT_TTL_SECONDS)])
      return res.status(200).json({ ok: true, updatedAt: snapshot.updatedAt })
    } catch (e) {
      console.error('Upstash write failed:', e)
      return res.status(500).json({ error: 'Failed to write snapshot' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
