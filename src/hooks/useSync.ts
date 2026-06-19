/**
 * useSync — connects the Zustand tasks store to the LAN sync server.
 *
 * - On mount, opens a WebSocket to `${host}/__helm-sync`.
 * - Subscribes to `useTasksStore`; whenever the local `tasks` array
 *   changes (and it wasn't caused by a remote snapshot), the entire
 *   array is sent as a `{ type: 'state', tasks }` message.
 * - Incoming `{ type: 'snapshot', tasks }` messages are merged into the
 *   local list using LWW and persisted to IndexedDB via `replaceAllTasks`.
 *
 * Echo suppression:
 *   The flag `applyingRemote` is set during the replaceAllTasks call so
 *   the subscription doesn't re-broadcast what just arrived.
 *
 * Resilience:
 *   - Auto-reconnects with exponential backoff (1s → 30s).
 *   - Exposes a `SyncStatusInfo` via the `useSyncStatus` selector so the
 *     UI badge can show connection state.
 */

import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { useTasksStore } from '@/store/tasksSlice'
import { buildSyncUrl, mergeTasks, type SyncStatusInfo } from '@/lib/sync'

// ----------------------------------------------------------------
// Sync status store — small Zustand store so non-React code can also
// update the badge and React components subscribe cleanly.
// ----------------------------------------------------------------

interface SyncStatusState extends SyncStatusInfo {}

interface SyncStatusActions {
  setStatus: (next: Partial<SyncStatusState>) => void
  reset: () => void
}

const initial: SyncStatusState = {
  status: 'idle',
  peerCount: 0,
  error: null,
  pushesSent: 0,
  snapshotsReceived: 0,
}

export const useSyncStatus = create<SyncStatusState & SyncStatusActions>((set) => ({
  ...initial,
  setStatus: (next) => set((s) => ({ ...s, ...next })),
  reset: () => set({ ...initial }),
}))

// ----------------------------------------------------------------
// useSync — main hook, call once near the root of the app.
// ----------------------------------------------------------------

interface UseSyncOptions {
  /** Disable the connection (useful in tests / preview environments). */
  enabled?: boolean
}

export function useSync(opts: UseSyncOptions = {}): void {
  const { enabled = true } = opts
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const applyingRemoteRef = useRef(false)
  // Track the last-serialized snapshot to skip no-op broadcasts.
  const lastSentRef = useRef<string>('')

  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return

    const setStatus = useSyncStatus.getState().setStatus

    function clearReconnectTimer() {
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }

    function scheduleReconnect() {
      clearReconnectTimer()
      const attempt = reconnectAttemptsRef.current
      // Exponential backoff capped at 30s.
      const delay = Math.min(30_000, 1_000 * Math.pow(2, attempt))
      reconnectAttemptsRef.current = attempt + 1
      setStatus({ status: 'reconnecting' })
      reconnectTimerRef.current = window.setTimeout(connect, delay)
    }

    function connect() {
      setStatus({ status: 'connecting', error: null })
      let ws: WebSocket
      try {
        ws = new WebSocket(buildSyncUrl())
      } catch (e) {
        setStatus({ status: 'error', error: (e as Error).message })
        scheduleReconnect()
        return
      }
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0
        setStatus({ status: 'connected', error: null })
        // Push our current state immediately so the server has it and
        // any other peers receive it.
        sendState(ws)
      }

      ws.onmessage = async (event) => {
        let msg: { type?: string; tasks?: unknown }
        try {
          msg = JSON.parse(event.data as string)
        } catch {
          return
        }
        if (msg.type !== 'snapshot' || !Array.isArray(msg.tasks)) return

        // Coerce + validate shape defensively. We don't trust the wire.
        const remote = msg.tasks as Parameters<typeof mergeTasks>[1]
        if (remote.length > 0) {
          const sample = remote[0] as unknown as Record<string, unknown>
          if (
            typeof sample.id !== 'string' ||
            typeof sample.updatedAt !== 'string' ||
            typeof sample.status !== 'string'
          ) {
            return
          }
        }

        applyingRemoteRef.current = true
        try {
          const local = useTasksStore.getState().tasks
          const merged = mergeTasks(local, remote)
          await useTasksStore.getState().replaceAllTasks(merged)
          setStatus({ snapshotsReceived: useSyncStatus.getState().snapshotsReceived + 1 })
        } catch (e) {
          setStatus({ error: (e as Error).message })
        } finally {
          // Defer clearing the flag until the next microtask so the
          // subscription effect below sees it.
          queueMicrotask(() => {
            applyingRemoteRef.current = false
          })
        }
      }

      ws.onerror = () => {
        // Browsers don't expose a useful message here; rely on close.
      }

      ws.onclose = () => {
        wsRef.current = null
        scheduleReconnect()
      }
    }

    function sendState(ws: WebSocket) {
      if (ws.readyState !== WebSocket.OPEN) return
      const tasks = useTasksStore.getState().tasks
      const json = JSON.stringify({ type: 'state', tasks })
      // Skip if nothing actually changed since last push (cheap guard).
      if (json === lastSentRef.current) return
      try {
        ws.send(json)
        lastSentRef.current = json
        setStatus({ pushesSent: useSyncStatus.getState().pushesSent + 1 })
      } catch {
        // Swallow — the next onclose will trigger reconnect.
      }
    }

    // Open the initial connection.
    connect()

    // Subscribe to local changes; push on every update.
    const unsubscribe = useTasksStore.subscribe((state, prev) => {
      if (applyingRemoteRef.current) return
      if (state.tasks === prev.tasks) return
      const ws = wsRef.current
      if (!ws) return
      sendState(ws)
    })

    return () => {
      unsubscribe()
      clearReconnectTimer()
      const ws = wsRef.current
      if (ws) {
        ws.onclose = null // Don't reconnect during teardown.
        ws.close()
        wsRef.current = null
      }
      useSyncStatus.getState().reset()
    }
  }, [enabled])
}