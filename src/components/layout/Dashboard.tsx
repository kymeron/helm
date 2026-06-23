import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { FilterBar } from '@/components/layout/FilterBar'
import { StatBar } from '@/components/stats/StatBar'
import { TypeDonut } from '@/components/stats/TypeDonut'
import { TrendLine } from '@/components/stats/TrendLine'
import { ActivityHeatmap } from '@/components/stats/ActivityHeatmap'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { TaskModal } from '@/components/kanban/TaskModal'
import { TaskDetailModal } from '@/components/kanban/TaskDetailModal'
import { useTasksStore, useUIStore } from '@/store'
import { useStats } from '@/hooks/useStats'
import { useSync } from '@/hooks/useSync'
import { useCloudSync } from '@/hooks/useCloudSync'
import type { Task, TimeRange } from '@/types/task'

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'all', label: '全部' },
]

function Dashboard() {
  const init = useTasksStore((s) => s.init)
  const initialized = useTasksStore((s) => s.initialized)
  const loading = useTasksStore((s) => s.loading)
  const error = useTasksStore((s) => s.error)
  const clearError = useTasksStore((s) => s.clearError)

  const modalOpen = useUIStore((s) => s.modalOpen)
  const editingTask = useUIStore((s) => s.editingTask)
  const closeModal = useUIStore((s) => s.closeModal)
  const openEditModal = useUIStore((s) => s.openEditModal)
  const timeRange = useUIStore((s) => s.timeRange)
  const setTimeRange = useUIStore((s) => s.setTimeRange)
  const showStats = useUIStore((s) => s.showStats)

  const [viewingTask, setViewingTask] = useState<Task | null>(null)

  const { typeDistribution, trendData, heatmapData } = useStats()

  useEffect(() => {
    if (!initialized) {
      init()
    }
  }, [initialized, init])

  // Mount the LAN sync layer once the store is up.
  // The hook opens its own WebSocket and pushes local mutations out.
  useSync({ enabled: initialized })

  // Mount the Vercel KV cloud sync layer.
  useCloudSync({ enabled: initialized })

  const handleEditTask = (task: Task) => {
    openEditModal(task)
  }

  const handleDeleteTask = async (taskId: string) => {
    const deleteTask = useTasksStore.getState().deleteTask
    await deleteTask(taskId)
  }

  if (!initialized && loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center animate-fade-in">
          {/* Meridian loader — rotating diamond */}
          <div className="relative w-8 h-8 mx-auto mb-4 flex items-center justify-center">
            <div className="w-4 h-4 border border-accent/30 rotate-45" />
            <div className="absolute w-2 h-2 bg-accent/40 rotate-45" />
          </div>
          <p className="helm-label">
            加载中
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="font-display text-2xl text-ink mb-2">
            出错了
          </div>
          <div className="font-mono text-[10px] text-ink-muted mb-6 max-w-md">
            {error}
          </div>
          <button
            onClick={() => {
              clearError()
              init()
            }}
            className="px-4 py-2 bg-accent text-bg font-mono text-xs uppercase tracking-wider hover:bg-accent/90 shadow-soft transition-all duration-200 ease-snappy rounded-lg"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <TopBar />

      <main className="flex-1 p-3 sm:p-4 overflow-y-auto">
        {/* Stats Section — toggleable via TopBar */}
        {showStats && (
        <section className="mb-3">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-lg font-normal text-ink">
              指标
            </h2>

            {/* Time Range Selector */}
            <div className="flex gap-px bg-surface border border-border rounded-md overflow-hidden shadow-soft">
              {timeRangeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTimeRange(opt.value)}
                  className={`px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-all duration-200 ease-snappy ${
                    timeRange === opt.value
                      ? 'bg-accent text-bg'
                      : 'text-ink-secondary hover:text-ink hover:bg-elevated'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Metrics Cards */}
          <StatBar />

          {/* Charts — 1 col on mobile, 2 cols on md (iPad portrait), 3 cols on lg */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1.4fr_2fr] gap-3 mt-3">
            <TypeDonut data={typeDistribution} />
            <TrendLine data={trendData} />
            <ActivityHeatmap data={heatmapData} />
          </div>
        </section>
        )}

        {/* Filter Bar */}
        <section className="mb-2">
          <FilterBar />
        </section>

        {/* Kanban Board */}
        <KanbanBoard
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onViewTask={setViewingTask}
        />
      </main>

      <TaskModal
        open={modalOpen}
        task={editingTask}
        onClose={closeModal}
      />

      <TaskDetailModal
        open={viewingTask !== null}
        task={viewingTask}
        onClose={() => setViewingTask(null)}
        onEdit={(task) => {
          setViewingTask(null)
          openEditModal(task)
        }}
      />
    </div>
  )
}

export { Dashboard }
