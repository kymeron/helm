import type { Task } from '@/types/task'

/**
 * Cloud snapshot stored in Vercel KV and exchanged between devices.
 */
export interface CloudSnapshot {
  tasks: Task[]
  updatedAt: string | null
}

/**
 * Cloud sync runtime status shown in the UI badge.
 */
export type CloudSyncStatus =
  | 'idle'      // KV not configured or sync layer disabled
  | 'syncing'   // Pushing or pulling
  | 'synced'    // Last pull aligned with server
  | 'offline'   // Network / service unavailable
  | 'error'     // Unexpected error, degraded to local

export interface CloudSyncState {
  status: CloudSyncStatus
  lastSyncedAt: string | null
  error: string | null
  pushesSent: number
  pullsReceived: number
}

export interface CloudSyncError {
  message: string
  recoverable: boolean
}
