/**
 * useCloudSync — Vercel KV snapshot sync layer.
 *
 * - Resolves an anonymous token from URL/localStorage on mount.
 * - Pulls the server snapshot on mount and every 5s when idle.
 * - Pushes local changes to the server with a 1s debounce.
 * - Merges remote snapshots into the local IndexedDB store via
 *   `replaceAllTasks`, using the existing LWW merge logic.
 * - Stays in `idle` if the server reports sync is not configured (503).
 * - Degrades to `offline` on network failures and retries automatically.
 */

import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { useTasksStore } from '@/store/tasksSlice'
import { pullSnapshot, pushSnapshot } from '@/lib/cloudSync'
import { mergeCloudSnapshot } from '@/lib/sync'
import { resolveToken } from '@/lib/token'
import type { CloudSyncState } from '@/types/sync'

const PULL_INTERVAL_MS = 5_000
const PUSH_DEBOUNCE_MS = 1_000

interface CloudSyncStore extends CloudSyncState {
  setStatus: (next: Partial<CloudSyncState>) => void
  reset: () => void
}

const initial: CloudSyncState = {
  status: 'idle',
  lastSyncedAt: null,
  error: null,
  pushesSent: 0,
  pullsReceived: 0,
}

export const useCloudSyncStatus = create<CloudSyncStore>((set) => ({
  ...initial,
  setStatus: (next) => set((s) => ({ ...s, ...next })),
  reset: () => set({ ...initial }),
}))

interface UseCloudSyncOptions {
  /** Disable the cloud sync layer entirely. */
  enabled?: boolean
}

function isNotConfiguredError(error: unknown): boolean {
  return error instanceof Error && /not configured/i.test(error.message)
}

export function useCloudSync(opts: UseCloudSyncOptions = {}): void {
  const { enabled = true } = opts
  const tokenRef = useRef<string | null>(null)
  const applyingRemoteRef = useRef(false)
  const pushTimerRef = useRef<number | null>(null)
  const pullTimerRef = useRef<number | null>(null)
  const lastSentRef = useRef<string>('')

  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return

    let cancelled = false
    const setStoreStatus = useCloudSyncStatus.getState().setStatus

    function clearPushTimer() {
      if (pushTimerRef.current != null) {
        window.clearTimeout(pushTimerRef.current)
        pushTimerRef.current = null
      }
    }

    function clearPullTimer() {
      if (pullTimerRef.current != null) {
        window.clearTimeout(pullTimerRef.current)
        pullTimerRef.current = null
      }
    }

    function schedulePull() {
      clearPullTimer()
      pullTimerRef.current = window.setTimeout(() => {
        pullTimerRef.current = null
        void pull()
      }, PULL_INTERVAL_MS)
    }

    async function pull() {
      const token = tokenRef.current
      if (!token) return

      setStoreStatus({ status: 'syncing', error: null })
      try {
        const snapshot = await pullSnapshot(token)
        if (cancelled) return

        const local = useTasksStore.getState().tasks
        const merged = mergeCloudSnapshot(local, snapshot)

        applyingRemoteRef.current = true
        try {
          await useTasksStore.getState().replaceAllTasks(merged)
        } finally {
          queueMicrotask(() => {
            applyingRemoteRef.current = false
          })
        }

        setStoreStatus({
          status: 'synced',
          lastSyncedAt: new Date().toISOString(),
          pullsReceived: useCloudSyncStatus.getState().pullsReceived + 1,
          error: null,
        })
      } catch (e) {
        if (cancelled) return
        if (isNotConfiguredError(e)) {
          setStoreStatus({ status: 'idle', error: null })
          return
        }
        setStoreStatus({
          status: navigator.onLine ? 'error' : 'offline',
          error: (e as Error).message,
        })
      } finally {
        if (!cancelled) {
          schedulePull()
        }
      }
    }

    async function push() {
      const token = tokenRef.current
      if (!token) return

      const tasks = useTasksStore.getState().tasks
      const json = JSON.stringify(tasks)
      if (json === lastSentRef.current) return

      setStoreStatus({ status: 'syncing', error: null })
      try {
        const result = await pushSnapshot(token, tasks)
        if (cancelled) return
        lastSentRef.current = json
        setStoreStatus({
          status: 'synced',
          lastSyncedAt: result.updatedAt,
          pushesSent: useCloudSyncStatus.getState().pushesSent + 1,
          error: null,
        })
      } catch (e) {
        if (cancelled) return
        if (isNotConfiguredError(e)) {
          setStoreStatus({ status: 'idle', error: null })
          return
        }
        setStoreStatus({
          status: navigator.onLine ? 'error' : 'offline',
          error: (e as Error).message,
        })
      }
    }

    function schedulePush() {
      clearPushTimer()
      pushTimerRef.current = window.setTimeout(() => {
        pushTimerRef.current = null
        void push()
      }, PUSH_DEBOUNCE_MS)
    }

    function handleOnline() {
      const status = useCloudSyncStatus.getState().status
      if (status === 'offline' || status === 'error') {
        void pull()
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void pull()
      }
    }

    // Initialize token and kick off first pull.
    tokenRef.current = resolveToken()
    void pull()

    // Subscribe to local task changes and debounce-push.
    const unsubscribe = useTasksStore.subscribe((state, prev) => {
      if (applyingRemoteRef.current) return
      if (state.tasks === prev.tasks) return
      schedulePush()
    })

    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      unsubscribe()
      clearPushTimer()
      clearPullTimer()
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      useCloudSyncStatus.getState().reset()
    }
  }, [enabled])
}
