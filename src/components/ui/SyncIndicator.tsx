import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useCloudSyncStatus } from '@/hooks/useCloudSync'
import { ShareDialog } from '@/components/ui/ShareDialog'

/**
 * Compact status pill for the TopBar.
 *
 * Shows the Upstash Redis cloud sync state (the only sync layer).
 * The `分享` chip opens a focused dialog with the full share URL and
 * key management actions. See [ShareDialog] for the interaction.
 *
 * Hover reveals push / receive counters for debugging.
 */
function SyncIndicator() {
  // Cloud sync state
  const cloudStatus = useCloudSyncStatus((s) => s.status)
  const cloudError = useCloudSyncStatus((s) => s.error)
  const cloudPushes = useCloudSyncStatus((s) => s.pushesSent)
  const cloudPulls = useCloudSyncStatus((s) => s.pullsReceived)
  const cloudLastSync = useCloudSyncStatus((s) => s.lastSyncedAt)

  // Share dialog visibility
  const [shareOpen, setShareOpen] = useState(false)

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
  }

  return (
    <>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div
          className="flex items-center gap-2 font-mono text-[10px] text-ink-muted uppercase tracking-widest"
          title={title}
          aria-label={`同步状态: ${label}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dot}`} style={dotStyle} aria-hidden="true" />
          <span>{label}</span>
        </div>
        <button
          onClick={() => setShareOpen(true)}
          className="px-2.5 sm:px-3 py-2 bg-surface border border-border text-ink-secondary hover:border-border-strong hover:text-ink shadow-soft transition-all duration-200 ease-snappy font-mono text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 sm:gap-2"
          title="打开分享面板,复制同步链接到其他设备"
          aria-label="打开分享面板"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          <span className="hidden sm:inline">分享</span>
        </button>
      </div>
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} />
    </>
  )
}

export { SyncIndicator }
