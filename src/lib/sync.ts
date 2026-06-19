/**
 * LAN Sync — client side.
 *
 * Pure helpers (no React, no WebSocket):
 *   - `mergeTasks(local, remote)`: last-write-wins reconciliation by
 *     `updatedAt`. Used by tests and could be reused server-side.
 *
 * WebSocket client lives in `src/hooks/useSync.ts`.
 */

import type { Task } from '@/types/task'

/**
 * Merge a remote snapshot into the local task list using Last-Write-Wins
 * per task, with `updatedAt` as the version vector.
 *
 * Rules:
 *   - Tasks only in `local` are kept.
 *   - Tasks only in `remote` are added.
 *   - Tasks in both: the one with the greater `updatedAt` wins. Ties go to
 *     `local` (no churn).
 *
 * This is a stable, idempotent merge: applying the same snapshot twice
 * produces the same result.
 */
export function mergeTasks(local: Task[], remote: Task[]): Task[] {
  if (remote.length === 0) return local
  if (local.length === 0) return remote

  const byId = new Map<string, Task>()
  for (const t of local) byId.set(t.id, t)

  for (const r of remote) {
    const l = byId.get(r.id)
    if (!l || r.updatedAt > l.updatedAt) {
      byId.set(r.id, r)
    }
  }

  return Array.from(byId.values())
}

/** Sync WebSocket endpoint path — must match `vite-plugin-sync.ts`. */
export const SYNC_PATH = '/__helm-sync'

/** Build the WebSocket URL from the current page origin. */
export function buildSyncUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}${SYNC_PATH}`
}

/**
 * Lightweight connection status enum shared by the client and the UI badge.
 */
export type SyncStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error'

export interface SyncStatusInfo {
  status: SyncStatus
  /** Number of *other* peers connected to the same sync server (approximate). */
  peerCount: number
  /** Most recent error message, if any. */
  error: string | null
  /** Number of state pushes sent since connection started. */
  pushesSent: number
  /** Number of remote snapshots received since connection started. */
  snapshotsReceived: number
}