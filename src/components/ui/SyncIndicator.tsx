import type { CSSProperties } from 'react'
import { useSyncStatus } from '@/hooks/useSync'

/**
 * Compact status pill for the TopBar.
 *
 *   🟢 已同步  ·  3 台设备
 *   🟡 连接中…
 *   🔴 离线 / 出错
 *
 * Hover reveals push / receive counters for debugging.
 */
function SyncIndicator() {
  const status = useSyncStatus((s) => s.status)
  const error = useSyncStatus((s) => s.error)
  const pushesSent = useSyncStatus((s) => s.pushesSent)
  const snapshotsReceived = useSyncStatus((s) => s.snapshotsReceived)

  // Map status → (dot className, dot style, label, title).
  let dot = 'bg-ink-muted'
  let dotStyle: CSSProperties | undefined
  let label = '未连接'
  let title = '尚未建立同步连接'

  if (status === 'connecting') {
    dot = 'bg-warning animate-pulse'
    label = '连接中'
    title = '正在连接同步服务器…'
  } else if (status === 'connected') {
    dot = 'animate-success-pulse'
    dotStyle = { backgroundColor: '#5eead4', boxShadow: '0 0 6px rgba(94, 234, 212, 0.6)' }
    label = '已同步'
    title = `已连接同步服务器\n推送 ${pushesSent} 次 · 接收 ${snapshotsReceived} 次`
  } else if (status === 'reconnecting') {
    dot = 'bg-warning animate-pulse'
    label = '重连中'
    title = '连接中断,正在重试…'
  } else if (status === 'error') {
    dot = 'bg-danger'
    label = '同步出错'
    title = error ?? '同步出现错误'
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