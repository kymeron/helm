import type { CSSProperties } from 'react'
import { useSyncStatus } from '@/hooks/useSync'
import { useCloudSyncStatus } from '@/hooks/useCloudSync'

/**
 * Compact status pill for the TopBar.
 *
 * Shows the best available sync state:
 *   - Vercel KV cloud sync when configured (production / Vercel deployments).
 *   - LAN WebSocket sync as a fallback (development / local WiFi).
 *
 * 🟢 已同步  ·  3 台设备
 * 🟡 连接中…
 * 🔴 离线 / 出错
 *
 * Hover reveals push / receive counters for debugging.
 */
function SyncIndicator() {
  // LAN sync state
  const lanStatus = useSyncStatus((s) => s.status)
  const lanError = useSyncStatus((s) => s.error)
  const lanPushes = useSyncStatus((s) => s.pushesSent)
  const lanReceived = useSyncStatus((s) => s.snapshotsReceived)
  const peerCount = useSyncStatus((s) => s.peerCount)

  // Cloud sync state
  const cloudStatus = useCloudSyncStatus((s) => s.status)
  const cloudError = useCloudSyncStatus((s) => s.error)
  const cloudPushes = useCloudSyncStatus((s) => s.pushesSent)
  const cloudPulls = useCloudSyncStatus((s) => s.pullsReceived)
  const cloudLastSync = useCloudSyncStatus((s) => s.lastSyncedAt)

  // Priorities: cloud synced > cloud syncing > cloud error/offline > LAN connected > LAN connecting > LAN error > idle
  let dot = 'bg-ink-muted'
  let dotStyle: CSSProperties | undefined
  let label = '未连接'
  let title = '尚未建立同步连接'

  if (cloudStatus === 'synced') {
    dot = 'animate-success-pulse'
    dotStyle = { backgroundColor: '#5eead4', boxShadow: '0 0 6px rgba(94, 234, 212, 0.6)' }
    label = '已同步'
    title = `云端已同步\n推送 ${cloudPushes} 次 · 拉取 ${cloudPulls} 次\n最后同步: ${cloudLastSync ?? '刚刚'}`
  } else if (cloudStatus === 'syncing') {
    dot = 'bg-warning animate-pulse'
    label = '同步中'
    title = '正在与云端同步…'
  } else if (cloudStatus === 'offline') {
    dot = 'bg-warning'
    label = '离线'
    title = '云端同步离线,网络恢复后自动重试'
  } else if (cloudStatus === 'error') {
    dot = 'bg-danger'
    label = '同步出错'
    title = cloudError ?? '云端同步出现错误'
  } else if (lanStatus === 'connected') {
    dot = 'animate-success-pulse'
    dotStyle = { backgroundColor: '#5eead4', boxShadow: '0 0 6px rgba(94, 234, 212, 0.6)' }
    label = '已同步'
    title = `局域网已连接 · ${peerCount} 台设备\n推送 ${lanPushes} 次 · 接收 ${lanReceived} 次`
  } else if (lanStatus === 'connecting' || lanStatus === 'reconnecting') {
    dot = 'bg-warning animate-pulse'
    label = '连接中'
    title = '正在连接局域网同步服务器…'
  } else if (lanStatus === 'error') {
    dot = 'bg-danger'
    label = '同步出错'
    title = lanError ?? '局域网同步出现错误'
  }

  return (
    <div
      className="flex items-center gap-2 font-mono text-[10px] text-ink-muted uppercase tracking-widest"
      title={title}
      aria-label={`同步状态: ${label}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} style={dotStyle} aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export { SyncIndicator }
