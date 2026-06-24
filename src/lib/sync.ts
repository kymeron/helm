/**
 * Cloud sync — pure helpers.
 *
 * `mergeTasks` implements last-write-wins reconciliation by `updatedAt`
 * and is used by both the cloud sync layer and unit tests.
 * `mergeCloudSnapshot` is a thin wrapper for the cloud snapshot shape.
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

/**
 * Merge a server snapshot into the local task list.
 *
 * Convenience wrapper around `mergeTasks` that extracts the task array
 * from a `CloudSnapshot`. Deletions with newer `updatedAt` propagate
 * correctly via `deletedAt` tombstones.
 */
export function mergeCloudSnapshot(local: Task[], snapshot: { tasks: Task[] }): Task[] {
  return mergeTasks(local, snapshot.tasks)
}
