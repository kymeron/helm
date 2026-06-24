import { useState, useCallback } from 'react'
import type { CSSProperties } from 'react'
import { useSyncStatus } from '@/hooks/useSync'
import { useCloudSyncStatus } from '@/hooks/useCloudSync'
import { buildShareUrl, readTokenFromStorage } from '@/lib/token'

/**
 * Compact status pill for the TopBar.
 *
 * Shows the best available sync state:
 *   - Upstash Redis cloud sync when configured (Vercel deployments).
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

  // Share link state
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  const handleShare = useCallback(async () => {
    setCopyError(null)
    const token = readTokenFromStorage()
    if (!token) {
      setCopyError('尚未建立同步标识')
      return
    }
    const url = buildShareUrl(token)
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        // Fallback for non-secure contexts (e.g. plain http on LAN).
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      setCopyError((e as Error).message || '复制失败')
    }
  }, [])

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
        onClick={handleShare}
        className="font-mono text-[10px] uppercase tracking-widest text-ink-muted hover:text-accent border border-border hover:border-accent/40 px-1.5 py-0.5 rounded transition-colors duration-200"
        title={copyError ?? '复制分享链接,粘贴到其他设备以同步数据'}
        aria-label="复制分享链接"
      >
        {copied ? '已复制' : '分享'}
      </button>
    </div>
  )
}

export { SyncIndicator }

