import { useState, useEffect, useCallback } from 'react'
import { useUIStore } from '@/store'
import logoSvg from '@/assets/logo.svg?raw'

const LOGO_COLOR = '#5eead4'

function TopBar() {
  const searchQuery = useUIStore((s) => s.searchQuery)
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)
  const showStats = useUIStore((s) => s.showStats)
  const toggleStats = useUIStore((s) => s.toggleStats)

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }, [])

  const datePart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const timePart = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

  return (
    <header className="border-b border-border bg-surface/70 backdrop-blur-md sticky top-0 z-10">
      <div className="px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Wordmark */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 z-10">
          <div className="relative flex items-center justify-center">
            <div
              className="w-6 h-6 sm:w-7 sm:h-7 [&_svg]:!w-full [&_svg]:!h-full"
              dangerouslySetInnerHTML={{
                __html: logoSvg
                  .replace('#00FF66', LOGO_COLOR)
                  .replace('width="400" height="400"', ''),
              }}
            />
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-normal tracking-tight text-ink leading-none">
            HELM
          </h1>
        </div>

        {/* Search Bar — flex item on mobile (flex-1), absolute centered on md+ */}
        <div className="flex-1 min-w-0 md:flex-none md:absolute md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-72">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索任务..."
              className="w-full pl-9 pr-3 py-2 bg-bg-2 border border-border rounded-lg text-sm text-ink placeholder:text-ink-muted focus:border-accent/40 focus:outline-none transition-colors duration-200"
            />
          </div>
        </div>

        {/* Status + Actions — right aligned */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="hidden lg:flex items-center gap-4 font-mono text-[10px] text-ink-muted uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full animate-matrix-pulse" style={{ backgroundColor: '#00ff41', boxShadow: '0 0 6px rgba(0, 255, 65, 0.6)' }} />
              <span>在线</span>
            </div>
            <div className="tabular-nums flex items-center gap-1.5">
              <span className="font-mono text-sm text-accent" style={{ textShadow: '0 0 8px rgba(94, 234, 212, 0.6)' }}>
                {datePart}
              </span>
              <span className="text-accent/30">·</span>
              <span className="font-mono text-sm text-accent" style={{ textShadow: '0 0 8px rgba(94, 234, 212, 0.6)' }}>
                {timePart}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={toggleStats}
              className={`px-2.5 sm:px-3 py-2 border shadow-soft transition-all duration-200 ease-snappy font-mono text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 sm:gap-2 ${
                showStats
                  ? 'bg-accent/10 border-accent/40 text-accent'
                  : 'bg-surface border-border text-ink-secondary hover:border-border-strong hover:text-ink'
              }`}
              title={showStats ? '隐藏指标与图表' : '显示指标与图表'}
              aria-label={showStats ? '隐藏指标与图表' : '显示指标与图表'}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6m6 6V9m-3 10V5M4 20h16" />
              </svg>
              <span className="hidden sm:inline">指标</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="hidden sm:inline-flex px-3 py-2 bg-surface border border-border text-ink-secondary hover:border-border-strong hover:text-ink shadow-soft transition-all duration-200 ease-snappy font-mono text-xs uppercase tracking-wider rounded-lg items-center gap-2"
              title={isFullscreen ? '退出全屏' : '进入全屏'}
              aria-label={isFullscreen ? '退出全屏' : '进入全屏'}
            >
              {isFullscreen ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l4 4m12-4h-4m4 0v4m0-4l-4 4M4 16v4m0 0h4m-4 0l4-4m12 4l-4-4m4 4v-4m0 4l-4-4" />
                </svg>
              )}
              <span>{isFullscreen ? '退出' : '全屏'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export { TopBar }
