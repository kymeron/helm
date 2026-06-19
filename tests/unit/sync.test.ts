import { describe, it, expect } from 'vitest'
import { mergeTasks, buildSyncUrl, SYNC_PATH } from '@/lib/sync'
import type { Task, TaskStatus, TaskType, Priority } from '@/types/task'

interface TaskOverrides extends Partial<Omit<Task, 'id' | 'updatedAt'>> {
  id: string
  updatedAt: string
}

function task(overrides: TaskOverrides): Task {
  const status: TaskStatus = overrides.status ?? 'todo'
  const type: TaskType = overrides.type ?? 'idea'
  const priority: Priority = overrides.priority ?? 'medium'
  return {
    id: overrides.id,
    title: overrides.title ?? `task-${overrides.id}`,
    description: overrides.description ?? '',
    type,
    status,
    priority,
    tags: overrides.tags ?? [],
    createdAt: overrides.createdAt ?? overrides.updatedAt,
    updatedAt: overrides.updatedAt,
    completedAt: overrides.completedAt ?? null,
    deletedAt: overrides.deletedAt ?? null,
  }
}

describe('mergeTasks — Last-Write-Wins by updatedAt with tombstone support', () => {
  // Deletion semantics: delete operations set `deletedAt` instead of
  // physically removing the row. Tombstones propagate through the LWW
  // pipeline because they are normal Task records — the tombstone just
  // wins at the time of deletion. UI consumers filter `deletedAt` via
  // the `selectActiveTasks` selector.

  it('returns local when remote is empty', () => {
    const local = [task({ id: 'a', updatedAt: '2026-06-19T10:00:00Z' })]
    const result = mergeTasks(local, [])
    expect(result).toEqual(local)
  })

  it('returns remote when local is empty', () => {
    const remote = [task({ id: 'a', updatedAt: '2026-06-19T10:00:00Z' })]
    const result = mergeTasks([], remote)
    expect(result).toEqual(remote)
  })

  it('adds tasks that only exist in remote', () => {
    const local = [task({ id: 'a', updatedAt: '2026-06-19T10:00:00Z' })]
    const remote = [
      task({ id: 'a', updatedAt: '2026-06-19T10:00:00Z' }),
      task({ id: 'b', updatedAt: '2026-06-19T10:01:00Z', title: 'new' }),
    ]
    const result = mergeTasks(local, remote)
    expect(result.map((t) => t.id).sort()).toEqual(['a', 'b'])
  })

  it('keeps tasks that only exist in local (offline addition safety net)', () => {
    const local = [
      task({ id: 'a', updatedAt: '2026-06-19T10:00:00Z' }),
      task({ id: 'b', updatedAt: '2026-06-19T10:00:00Z' }),
    ]
    const remote = [task({ id: 'a', updatedAt: '2026-06-19T10:00:00Z' })]
    const result = mergeTasks(local, remote)
    expect(result.map((t) => t.id).sort()).toEqual(['a', 'b'])
  })

  it('takes remote when its updatedAt is later', () => {
    const a_local = task({ id: 'a', updatedAt: '2026-06-19T10:00:00Z', title: 'old' })
    const a_remote = task({ id: 'a', updatedAt: '2026-06-19T11:00:00Z', title: 'new' })
    const result = mergeTasks([a_local], [a_remote])
    expect(result[0]?.title).toBe('new')
  })

  it('keeps local when its updatedAt is later', () => {
    const a_local = task({ id: 'a', updatedAt: '2026-06-19T11:00:00Z', title: 'newer' })
    const a_remote = task({ id: 'a', updatedAt: '2026-06-19T10:00:00Z', title: 'older' })
    const result = mergeTasks([a_local], [a_remote])
    expect(result[0]?.title).toBe('newer')
  })

  it('keeps local on timestamp ties (idempotent + no churn)', () => {
    const a_local = task({ id: 'a', updatedAt: '2026-06-19T10:00:00Z', title: 'local' })
    const a_remote = task({ id: 'a', updatedAt: '2026-06-19T10:00:00Z', title: 'remote' })
    const result = mergeTasks([a_local], [a_remote])
    expect(result[0]?.title).toBe('local')
  })

  it('merges a realistic concurrent edit scenario', () => {
    const local = [
      task({ id: 'a', updatedAt: '2026-06-19T09:00:00Z', title: 'A on mac' }),
      task({ id: 'b', updatedAt: '2026-06-19T10:00:00Z', title: 'B on mac' }),
    ]
    const remote = [
      // a is newer on iPad — take it
      task({ id: 'a', updatedAt: '2026-06-19T10:30:00Z', title: 'A on ipad' }),
      // b is older on iPad — keep mac's
      task({ id: 'b', updatedAt: '2026-06-19T09:30:00Z', title: 'B on ipad' }),
      // d only exists on iPad — add it
      task({ id: 'd', updatedAt: '2026-06-19T10:15:00Z', title: 'D on ipad' }),
    ]
    const result = mergeTasks(local, remote)
    const byId = new Map(result.map((t) => [t.id, t]))
    expect(result.length).toBe(3)
    expect(byId.get('a')?.title).toBe('A on ipad')
    expect(byId.get('b')?.title).toBe('B on mac')
    expect(byId.get('d')?.title).toBe('D on ipad')
  })

  it('is idempotent — applying the same remote twice yields same result', () => {
    const local: Task[] = []
    const remote = [
      task({ id: 'a', updatedAt: '2026-06-19T10:00:00Z' }),
      task({ id: 'b', updatedAt: '2026-06-19T10:01:00Z' }),
    ]
    const once = mergeTasks(local, remote)
    const twice = mergeTasks(once, remote)
    expect(twice).toEqual(once)
  })

  it('propagates deletions via tombstone (deletedAt field)', () => {
    // Mac deletes A → A's row stays but with deletedAt set.
    // Mac pushes the new snapshot to other devices. Each remote applies
    // LWW — the tombstone (newer updatedAt) replaces the live row.
    const localBefore = [
      task({ id: 'a', updatedAt: '2026-06-19T09:00:00Z' }),
      task({ id: 'b', updatedAt: '2026-06-19T09:00:00Z' }),
    ]
    const remoteTombstone = [
      task({
        id: 'a',
        updatedAt: '2026-06-19T09:30:00Z',
        deletedAt: '2026-06-19T09:30:00Z',
      }),
      task({ id: 'b', updatedAt: '2026-06-19T09:00:00Z' }),
    ]
    const result = mergeTasks(localBefore, remoteTombstone)
    expect(result.length).toBe(2)
    const a = result.find((t) => t.id === 'a')
    expect(a?.deletedAt).toBe('2026-06-19T09:30:00Z')
  })

  it('preserves an older local edit when remote tombstone is older (out-of-order arrival)', () => {
    // Edge case: device A receives a delayed tombstone from device B but
    // has since re-edited the same task locally. The local edit wins by
    // updatedAt — the tombstone is discarded. (In practice, network
    // delivery is in-order within a session, but be defensive.)
    const localAfterEdit = [
      task({
        id: 'a',
        updatedAt: '2026-06-19T10:00:00Z',
        title: 'A re-edited',
      }),
    ]
    const remoteStaleTombstone = [
      task({
        id: 'a',
        updatedAt: '2026-06-19T09:30:00Z',
        deletedAt: '2026-06-19T09:30:00Z',
      }),
    ]
    const result = mergeTasks(localAfterEdit, remoteStaleTombstone)
    expect(result.length).toBe(1)
    expect(result[0]?.title).toBe('A re-edited')
    expect(result[0]?.deletedAt).toBeNull()
  })
})

describe('sync URL helpers', () => {
  it('uses ws:// for http pages', () => {
    Object.defineProperty(window, 'location', {
      value: { protocol: 'http:', host: '192.168.1.42:5173' },
      writable: true,
    })
    expect(buildSyncUrl()).toBe('ws://192.168.1.42:5173' + SYNC_PATH)
  })

  it('uses wss:// for https pages', () => {
    Object.defineProperty(window, 'location', {
      value: { protocol: 'https:', host: 'helm.example.com' },
      writable: true,
    })
    expect(buildSyncUrl()).toBe('wss://helm.example.com' + SYNC_PATH)
  })
})