import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCloudSync, useCloudSyncStatus } from '@/hooks/useCloudSync'
import { useTasksStore } from '@/store/tasksSlice'
import type { Task } from '@/types/task'

const mockFetch = vi.fn()
const mockReplaceAllTasks = vi.fn()

vi.stubGlobal('fetch', mockFetch)

// Mock replaceAllTasks so we don't need a real IndexedDB.
vi.mock('@/store/tasksSlice', async () => {
  const actual = await vi.importActual<typeof import('@/store/tasksSlice')>('@/store/tasksSlice')
  return {
    ...actual,
    useTasksStore: {
      ...actual.useTasksStore,
      getState: vi.fn(() => ({
        ...actual.useTasksStore.getState(),
        tasks: [],
        replaceAllTasks: mockReplaceAllTasks,
      })),
      subscribe: actual.useTasksStore.subscribe,
    },
  }
})

function task(id: string, updatedAt: string): Task {
  return {
    id,
    title: `task-${id}`,
    description: '',
    status: 'todo',
    priority: 'medium',
    tags: ['idea'],
    createdAt: updatedAt,
    updatedAt,
    completedAt: null,
    deletedAt: null,
  }
}

describe('useCloudSync', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
    window.localStorage.clear()
    mockFetch.mockReset()
    mockReplaceAllTasks.mockReset()
    useCloudSyncStatus.getState().reset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stays idle when server reports sync is not configured', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'Sync not configured' }),
    })

    renderHook(() => useCloudSync({ enabled: true }))

    await waitFor(() => {
      expect(useCloudSyncStatus.getState().status).toBe('idle')
    })
  })

  it('pulls remote snapshot and merges into local store', async () => {
    const remoteTasks = [task('a', '2026-06-21T10:00:00Z')]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ tasks: remoteTasks, updatedAt: '2026-06-21T10:00:00Z' }),
    })

    renderHook(() => useCloudSync({ enabled: true }))

    await waitFor(() => {
      expect(mockReplaceAllTasks).toHaveBeenCalledWith(remoteTasks)
      expect(useCloudSyncStatus.getState().status).toBe('synced')
      expect(useCloudSyncStatus.getState().pullsReceived).toBe(1)
    })
  })

  it('debounce-pushes local task changes', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ tasks: [], updatedAt: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ok: true, updatedAt: '2026-06-21T10:01:00Z' }),
      })

    renderHook(() => useCloudSync({ enabled: true }))

    await waitFor(() => expect(useCloudSyncStatus.getState().status).toBe('synced'))

    // Trigger a local task change; the hook should schedule a push.
    useTasksStore.setState({ tasks: [task('b', '2026-06-21T10:01:00Z')] })

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.stringContaining('/api/sync?token='),
          expect.objectContaining({ method: 'POST' }),
        )
        expect(useCloudSyncStatus.getState().pushesSent).toBe(1)
      },
      { timeout: 3000 },
    )
  })

  it('marks status offline when fetch fails and navigator is offline', async () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true })

    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    renderHook(() => useCloudSync({ enabled: true }))

    await waitFor(() => {
      expect(useCloudSyncStatus.getState().status).toBe('offline')
    })

    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true })
  })
})
