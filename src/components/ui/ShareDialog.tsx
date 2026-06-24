import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { KeyboardEvent } from 'react'
import { buildShareUrl, generateToken, readTokenFromStorage, persistToken } from '@/lib/token'

interface ShareDialogProps {
  open: boolean
  onClose: () => void
}

/**
 * Share & key management dialog.
 *
 * Opens a focused modal that lets the user copy the shareable sync URL
 * and (optionally) re-roll the sync identity. Triggered from the
 * `分享` chip in the TopBar.
 *
 * Layout intentionally mirrors the existing `Modal` component
 * (max-h-90dvh bottom-sheet on mobile, centered card on md+) so the
 * panel never sits too high or gets clipped by the sticky TopBar.
 *
 * Design notes:
 * - The "key" is the user's anonymous token. We display the URL broken
 *   across `<base>` + `<key>` so the eye lands on the part that actually
 *   identifies the dataset.
 * - "Re-roll" intentionally moves below the main action and uses a
 *   danger outline to make its destructive nature obvious.
 */
function ShareDialog({ open, onClose }: ShareDialogProps) {
  const [token, setToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [confirmingReroll, setConfirmingReroll] = useState(false)
  const copyButtonRef = useRef<HTMLButtonElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)

  // Build URL once per open, so the displayed value stays stable while
  // the user is reading it.
  const url = useMemo(() => (token ? buildShareUrl(token) : ''), [token])
  const [base, query = ''] = useMemo(() => {
    if (!url) return ['', '']
    const qIndex = url.indexOf('?')
    return qIndex === -1 ? [url, ''] : [url.slice(0, qIndex), url.slice(qIndex + 1)]
  }, [url])

  useEffect(() => {
    if (!open) return
    setToken(readTokenFromStorage())
    setCopied(false)
    setCopyError(null)
    setConfirmingReroll(false)
    // Defer focus to the next frame so the slide-up animation can run first.
    const id = window.requestAnimationFrame(() => {
      copyButtonRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [open])

  // Reset the "已复制" pulse on its own timer so it's independent of the
  // copy action itself.
  useEffect(() => {
    if (!copied) return
    if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = window.setTimeout(() => setCopied(false), 2400)
    return () => {
      if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current)
    }
  }, [copied])

  // Esc closes the dialog (but not the confirm-reroll state).
  useEffect(() => {
    if (!open) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmingReroll) setConfirmingReroll(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, confirmingReroll])

  const copy = useCallback(async () => {
    if (!url) return
    setCopyError(null)
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
    } catch (e) {
      setCopyError((e as Error).message || '复制失败')
    }
  }, [url])

  const reroll = useCallback(() => {
    const next = generateToken()
    persistToken(next)
    setToken(next)
    setConfirmingReroll(false)
    setCopied(false)
    setCopyError(null)
  }, [])

  const onKeyDownOnActions = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void copy()
    }
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:grid md:place-items-center md:p-14"
      onKeyDown={onKeyDownOnActions}
    >
      {/* Backdrop — same treatment as `Modal`. Pinned to viewport,
          separate stacking context from the centering grid so clicking
          outside the panel always dismisses. */}
      <div
        className="fixed inset-0 bg-ink/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — true center-of-the-remainder. On md+ the outer
          container is a grid with `place-items-center` and 56px of
          padding on every side, so the panel sits exactly in the
          middle of the area NOT covered by the sticky TopBar. On
          mobile the container falls back to a flex bottom-sheet so
          the soft keyboard never crops the URL. */}
      <div
        className="relative w-full max-h-[90dvh] overflow-y-auto md:max-h-[calc(100dvh-112px)] md:max-w-md md:rounded-xl rounded-t-xl shadow-soft-lg animate-slide-up bg-surface border border-border"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" aria-hidden="true" />
            <span id="share-dialog-title">SYNC · SHARED KEY</span>
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink p-1 -mr-1 transition-colors duration-200 ease-snappy"
            aria-label="关闭"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* Lead — explain what the key is, briefly */}
          <p className="text-[13px] leading-relaxed text-ink-secondary">
            把下面的链接发送到另一台设备的浏览器,该设备就会加入当前的数据集。
            <span className="block mt-1 text-ink-muted">
              不要把链接发给不信任的人 —— 拿到链接即可读取/修改你的任务。
            </span>
          </p>

          {/* URL display — rendered as base + ?token so the eye locks on the
              actual data partition key. Mono, monospaced numerals, tight. */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted mb-1.5">
              URL
            </div>
            <div
              className="font-mono text-[12px] leading-relaxed text-ink break-all bg-bg-2 border border-border rounded px-3 py-2.5 select-all"
              aria-label="分享链接"
            >
              <span className="text-ink-muted">{base}</span>
              <span className="text-ink-muted">?</span>
              <span className="text-accent">{query}</span>
            </div>
          </div>

          {/* Key fingerprint — show first 6 + last 4 chars of the token so
              the user can sanity-check the value visually. */}
          {token && (
            <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted">
              <span className="uppercase tracking-[0.2em]">KEY FINGERPRINT</span>
              <span className="tabular-nums text-ink-secondary">
                {token.slice(0, 6)}…{token.slice(-4)}
              </span>
            </div>
          )}

          {/* Status row — copy feedback, replaces itself */}
          <div className="min-h-[18px] font-mono text-[11px] uppercase tracking-[0.2em]">
            {copied ? (
              <span className="text-accent" aria-live="polite">✓ 已复制到剪贴板</span>
            ) : copyError ? (
              <span className="text-danger" aria-live="polite">! {copyError}</span>
            ) : (
              <span className="text-ink-muted">⌘/CTRL + ENTER 复制</span>
            )}
          </div>

          {/* Actions — primary copy fills width, close is secondary */}
          <div className="flex items-center gap-2 pt-1">
            <button
              ref={copyButtonRef}
              onClick={copy}
              disabled={!url}
              className="flex-1 font-mono text-[11px] uppercase tracking-[0.2em] text-bg bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2.5 rounded transition-colors"
            >
              {copied ? '复制成功' : '复制链接'}
            </button>
            <button
              onClick={onClose}
              className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-secondary hover:text-ink border border-border hover:border-border-strong px-3 py-2.5 rounded transition-colors"
            >
              关闭
            </button>
          </div>

          {/* Divider — single hairline, signals the destructive section below */}
          <div className="border-t border-border" />

          {/* Reroll — confirmable destructive action */}
          {!confirmingReroll ? (
            <button
              onClick={() => setConfirmingReroll(true)}
              className="w-full text-left font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted hover:text-danger transition-colors"
            >
              ▸ 重新生成同步标识
            </button>
          ) : (
            <div className="bg-bg-2 border border-danger/30 rounded px-3 py-2.5 space-y-2">
              <p className="text-[12px] text-ink-secondary leading-relaxed">
                旧链接在其他设备会立即失效,云端数据不会自动清除(可手动在 Upstash 删除)。
                <span className="block mt-1 text-ink-muted">
                  其他设备需要你重新发送新链接才能继续同步。
                </span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={reroll}
                  className="font-mono text-[11px] uppercase tracking-[0.2em] text-danger border border-danger/40 hover:bg-danger/10 px-3 py-1.5 rounded transition-colors"
                >
                  确认重新生成
                </button>
                <button
                  onClick={() => setConfirmingReroll(false)}
                  className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted hover:text-ink px-3 py-1.5 rounded transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export { ShareDialog }
