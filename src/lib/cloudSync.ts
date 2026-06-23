/**
 * Cloud sync HTTP helpers.
 *
 * These functions talk to the Vercel serverless API route at /api/sync.
 * They are intentionally thin and only serialize/parse the snapshot shape;
 * conflict merging happens elsewhere.
 */

import type { CloudSnapshot } from '@/types/sync'
import type { Task } from '@/types/task'

const MAX_PAYLOAD_BYTES = 1024 * 1024 // 1 MB, must match api/sync.ts

export interface PushResult {
  ok: true
  updatedAt: string
}

export interface SyncApiError {
  error: string
}

function buildSyncUrl(token: string): string {
  const url = new URL('/api/sync', window.location.origin)
  url.searchParams.set('token', token)
  return url.toString()
}

function isJsonResponse(res: Response): boolean {
  const type = res.headers.get('content-type') ?? ''
  return type.includes('application/json')
}

/**
 * Pull the latest snapshot from the server for the given token.
 */
export async function pullSnapshot(token: string): Promise<CloudSnapshot> {
  const res = await fetch(buildSyncUrl(token), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    let message = `Sync pull failed (${res.status})`
    if (isJsonResponse(res)) {
      const body = (await res.json()) as SyncApiError
      if (body.error) message = body.error
    }
    throw new Error(message)
  }

  return (await res.json()) as CloudSnapshot
}

/**
 * Push the local task list to the server for the given token.
 */
export async function pushSnapshot(token: string, tasks: Task[]): Promise<PushResult> {
  const body = JSON.stringify({ tasks })
  if (body.length > MAX_PAYLOAD_BYTES) {
    throw new Error('Snapshot too large')
  }

  const res = await fetch(buildSyncUrl(token), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  if (!res.ok) {
    let message = `Sync push failed (${res.status})`
    if (isJsonResponse(res)) {
      const body = (await res.json()) as SyncApiError
      if (body.error) message = body.error
    }
    throw new Error(message)
  }

  return (await res.json()) as PushResult
}
